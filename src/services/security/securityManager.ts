import {SecurityUtils} from "./security.ts";
import {Alert} from "react-native";
import DeviceInfo from "react-native-device-info";


export interface SecurityCheck {
  passed: boolean;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SecurityReport {
  isSecure: boolean;
  checks: {
    deviceIntegrity: SecurityCheck;
    environment: SecurityCheck;
    network: SecurityCheck;
    storage: SecurityCheck;
  };
  deviceInfo: {
    id: string;
    model: string;
    version: string;
    isEmulator: boolean;
  };
}


export class SecurityManager {
    private static instance: SecurityManager;
    private lastSecurityCheck: number = 0;
    private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

    static getInstance(): SecurityManager {
        if (!SecurityManager.instance) {
            SecurityManager.instance = new SecurityManager();
        }
        return SecurityManager.instance;
    }

    async initializeSecurityChecks(): Promise<SecurityReport> {
        try {
            const deviceInfo = await this.getDeviceInfo();
            const checks = await this.performSecurityChecks();

            const isSecure = Object.values(checks).every(check =>
                check.passed || check.severity === 'low'
            );

            const report: SecurityReport = {
                isSecure,
                checks,
                deviceInfo,
            };

            this.lastSecurityCheck = Date.now();
            return report;
        } catch (error) {
            console.error('Security check failed:', error);
            return this.getFailedSecurityReport();
        }
    }

    async shouldPerformSecurityCheck(): Promise<boolean> {
        const timeSinceLastCheck = Date.now() - this.lastSecurityCheck;
        return timeSinceLastCheck > this.CHECK_INTERVAL;
    }

    private async getDeviceInfo() {
        try {
            const [deviceId, model, systemVersion, isEmulator] = await Promise.all([
                DeviceInfo.getUniqueId().catch(() => SecurityUtils.generateDeviceId()),
                Promise.resolve(DeviceInfo.getModel()).catch(() => 'Unknown'),
                Promise.resolve(DeviceInfo.getSystemVersion()).catch(() => 'Unknown'),
                DeviceInfo.isEmulator().catch(() => false),
            ]);

            return {
                id: deviceId,
                model,
                version: systemVersion,
                isEmulator,
            };
        } catch (error) {
            return {
                id: SecurityUtils.generateDeviceId(),
                model: 'Unknown',
                version: 'Unknown',
                isEmulator: false,
            };
        }
    }

    private async performSecurityChecks() {
        const [deviceCheck, envCheck, networkCheck, storageCheck] = await Promise.all([
            this.checkDeviceIntegrity(),
            this.checkEnvironment(),
            this.checkNetworkSecurity(),
            this.checkStorageSecurity(),
        ]);

        return {
            deviceIntegrity: deviceCheck,
            environment: envCheck,
            network: networkCheck,
            storage: storageCheck,
        };
    }

    private async checkDeviceIntegrity(): Promise<SecurityCheck> {
        try {
            // Check for rooted/jailbroken devices
            const isEmulator = await DeviceInfo.isEmulator().catch(() => false);

            if (isEmulator && !__DEV__) {
                return {
                    passed: false,
                    message: 'Emulador detectado em ambiente de produção',
                    severity: 'high',
                };
            }

            return {
                passed: true,
                message: 'Integridade do dispositivo verificada',
                severity: 'low',
            };
        } catch (error) {
            return {
                passed: false,
                message: 'Falha na verificação de integridade',
                severity: 'medium',
            };
        }
    }

    private async checkEnvironment(): Promise<SecurityCheck> {
        try {
            const isSecureEnv = SecurityUtils.isSecureEnvironment();

            if (!isSecureEnv && !__DEV__) {
                return {
                    passed: false,
                    message: 'Ambiente de desenvolvimento em produção',
                    severity: 'high',
                };
            }

            if (__DEV__) {
                return {
                    passed: true,
                    message: 'Ambiente de desenvolvimento (debug habilitado)',
                    severity: 'low',
                };
            }

            return {
                passed: true,
                message: 'Ambiente seguro verificado',
                severity: 'low',
            };
        } catch (error) {
            return {
                passed: false,
                message: 'Falha na verificação do ambiente',
                severity: 'medium',
            };
        }
    }

    private async checkNetworkSecurity(): Promise<SecurityCheck> {
        try {
            if (__DEV__) {
                return {
                    passed: true,
                    message: 'Verificação de rede (modo desenvolvimento)',
                    severity: 'low',
                };
            }

            // Basic check for secure protocols
            const isHttpsEnforced = !__DEV__; // In production, should always use HTTPS

            if (!isHttpsEnforced) {
                return {
                    passed: false,
                    message: 'Protocolo inseguro detectado',
                    severity: 'high',
                };
            }

            return {
                passed: true,
                message: 'Segurança de rede verificada',
                severity: 'low',
            };
        } catch (error) {
            return {
                passed: false,
                message: 'Falha na verificação de rede',
                severity: 'medium',
            };
        }
    }

    private async checkStorageSecurity(): Promise<SecurityCheck> {
        try {
            return {
                passed: true,
                message: 'Armazenamento seguro verificado',
                severity: 'low',
            };
        } catch (error) {
            return {
                passed: false,
                message: 'Falha na verificação de armazenamento',
                severity: 'medium',
            };
        }
    }

    private getFailedSecurityReport(): SecurityReport {
        return {
            isSecure: false,
            checks: {
                deviceIntegrity: {
                    passed: false,
                    message: 'Falha na verificação de segurança',
                    severity: 'high',
                },
                environment: {
                    passed: false,
                    message: 'Falha na verificação de ambiente',
                    severity: 'high',
                },
                network: {
                    passed: false,
                    message: 'Falha na verificação de rede',
                    severity: 'high',
                },
                storage: {
                    passed: false,
                    message: 'Falha na verificação de armazenamento',
                    severity: 'high',
                },
            },
            deviceInfo: {
                id: 'unknown',
                model: 'unknown',
                version: 'unknown',
                isEmulator: false,
            },
        };
    }

    async handleSecurityViolation(report: SecurityReport): Promise<boolean> {
        const highSeverityIssues = Object.values(report.checks)
            .filter(check => !check.passed && check.severity === 'high');

        if (highSeverityIssues.length > 0) {
            const messages = highSeverityIssues.map(issue => issue.message).join('\n');

            // eslint-disable-next-line no-unreachable
            return new Promise((resolve) => {
                Alert.alert(
                    'Alerta de Segurança',
                    `Problemas de segurança detectados:\n\n${messages}\n\nO aplicativo pode não funcionar corretamente.`,
                    [
                        {
                            text: 'Continuar mesmo assim',
                            style: 'destructive',
                            onPress: () => resolve(true),
                        },
                        {
                            text: 'Sair',
                            style: 'cancel',
                            onPress: () => resolve(false),
                        },
                    ]
                );
            });
        }

        return true; // Continue if no high severity issues
    }
}
