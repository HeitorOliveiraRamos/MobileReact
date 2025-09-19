# Guia de Segurança - Mobile App

Este documento descreve as implementações de segurança do aplicativo móvel e como configurá-las adequadamente.

## 🔒 Recursos de Segurança Implementados

### 1. Autenticação e Tokens
- **Validação JWT**: Verificação automática de expiração e estrutura dos tokens
- **Armazenamento Seguro**: Tokens criptografados com base64 no AsyncStorage
- **Expiração Automática**: Tokens antigos (>30 dias) são automaticamente removidos
- **Limpeza Segura**: Tokens inválidos são limpos automaticamente

### 2. Detecção de Ambiente
- **Verificação de Produção**: Detecta se o app está rodando em produção ou desenvolvimento
- **Detecção de Emulador**: Identifica emuladores em ambiente de produção
- **Verificação de Integridade**: Checks básicos de segurança do dispositivo

### 3. Configuração de API
- **HTTPS Obrigatório**: Em produção, apenas HTTPS é permitido
- **Headers de Segurança**: Headers automáticos para prevenção de ataques
- **Timeouts Configuráveis**: Diferentes timeouts para diferentes tipos de requisição
- **Interceptadores**: Tratamento automático de erros 401/403/5xx

### 4. Validação de Entrada
- **Sanitização**: Prevenção contra XSS e injeções
- **Validação de Email**: Formato de email validado
- **Validação de Senha**: Critérios de força de senha
- **Rate Limiting**: Prevenção contra ataques de força bruta

## 🚀 Configuração para Produção

### 1. Configurar URL da API de Produção
Edite o arquivo `src/api/config.ts`:
```typescript
const PRODUCTION_API_URL = 'https://sua-api-producao.com/api';
```

### 2. Configurar Host para Dispositivos Físicos (Desenvolvimento)
Para testar em dispositivos físicos durante desenvolvimento:
```typescript
const physicalDeviceHost = 'http://192.168.1.100:8080'; // Seu IP local
```

### 3. Variáveis de Ambiente
Você pode sobrescrever configurações usando variáveis de ambiente:
```bash
export API_HOST=http://192.168.1.100:8080
```

## 📱 Configuração por Plataforma

### Android
- Emulador: `http://10.0.2.2:8080`
- Dispositivo físico: Use o IP da sua máquina na rede local

### iOS
- Simulador: `http://localhost:8080`
- Dispositivo físico: Use o IP da sua máquina na rede local

## 🛡️ Verificações de Segurança

### Automáticas
- ✅ Validação de token na inicialização
- ✅ Re-validação quando o app volta ao primeiro plano
- ✅ Verificação periódica de segurança (5 minutos)
- ✅ Detecção de emulador em produção
- ✅ Verificação de ambiente seguro

### Manuais (Podem ser expandidas)
- 🔄 Detecção de root/jailbreak (requer bibliotecas adicionais)
- 🔄 Certificate pinning (requer configuração adicional)
- 🔄 Autenticação biométrica (requer react-native-biometrics)

## ⚠️ Alertas de Segurança

O app pode exibir alertas quando:
- Token expirado ou inválido
- Emulador detectado em produção
- Ambiente de desenvolvimento em produção
- Falhas de rede ou servidor

## 🔧 Manutenção

### Logs de Segurança
Em desenvolvimento, logs detalhados são exibidos no console. Em produção, considere implementar um serviço de logging remoto.

### Atualizações de Segurança
1. Monitore vulnerabilidades nas dependências: `npm audit`
2. Mantenha as bibliotecas atualizadas
3. Revise periodicamente as configurações de segurança

## 📋 Checklist de Deploy

Antes de publicar o app:

- [ ] URL de produção configurada
- [ ] HTTPS habilitado em produção
- [ ] Tokens de debug removidos
- [ ] Logs sensíveis removidos
- [ ] Certificados SSL válidos
- [ ] Rate limiting configurado no backend
- [ ] Backup e recovery testados

## 🚨 Incidentes de Segurança

Em caso de problemas:

1. **Token Comprometido**: Tokens são automaticamente invalidados
2. **Dispositivo Comprometido**: Usuário é alertado e pode optar por sair
3. **Problemas de Rede**: Fallbacks automáticos e mensagens amigáveis

## 📞 Suporte

Para problemas de segurança ou configuração, consulte:
- Documentação da API
- Logs do console (desenvolvimento)
- Equipe de desenvolvimento
