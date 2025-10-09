import React from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export type MenuItem = {
  key: string;
  label: string;
  iconClosed?: string; // emoji or short text to show when collapsed
};

export type SidebarProps = {
  open: boolean;
  widthStyle: any; // Animated style with width
  title?: string;
  nome?: string | null;
  onToggle: () => void;
  items: MenuItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onLogout: () => void;
};

export default function Sidebar({
  open,
  widthStyle,
  title = 'Menu',
  nome,
  onToggle,
  items,
  activeKey,
  onSelect,
  onLogout,
}: SidebarProps) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View style={[styles.sidebarOverlay, widthStyle, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.sidebarHeader}>
        {open && <Text style={styles.sidebarTitle}>{title}</Text>}
        <TouchableOpacity style={[styles.toggleButton, {marginTop: 4}]} onPress={onToggle} activeOpacity={0.7}>
          <Text style={styles.toggleIcon}>{open ? '‹' : '›'}</Text>
        </TouchableOpacity>
      </View>

      {/* User section */}
      {open && !!nome && (
        <View style={styles.sidebarUserSection}>
          <Text style={styles.greetingTextLarge} numberOfLines={1} ellipsizeMode="tail">
            Olá, {nome}!
          </Text>
        </View>
      )}

      {/* Menu items */}
      <View style={styles.sidebarContent}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={[styles.navItem, active && styles.navItemActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.navItemText, active && styles.navItemTextActive]}>
                {open ? item.label : (item.iconClosed ?? '•')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.sidebarFooter}>
        <TouchableOpacity onPress={onLogout} style={[styles.logoutBtn, {marginBottom: 8}]} activeOpacity={0.8}>
          <Text style={styles.logoutText}>{open ? 'Sair' : '⎋'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#122033',
    zIndex: 1000,
    paddingTop: 8,
    paddingBottom: 12,
    borderRightWidth: 1,
    borderRightColor: '#1f2f44',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: {width: 2, height: 0},
    elevation: 4,
  },
  sidebarHeader: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12},
  sidebarTitle: {flex: 1, fontSize: 18, fontWeight: '700', color: '#fff'},
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1d334d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIcon: {color: '#fff', fontSize: 20, fontWeight: '600'},
  sidebarContent: {flexGrow: 1, paddingHorizontal: 6},
  sidebarUserSection: { paddingHorizontal: 10, paddingBottom: 8, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1f2f44' },
  greetingTextLarge: { color: '#ffffff', fontSize: 18, fontWeight: '700', textAlign: 'left' },
  navItem: {
    borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, marginVertical: 4, backgroundColor: 'transparent',
  },
  navItemActive: {backgroundColor: '#1d334d'},
  navItemText: {color: '#d0d8e2', fontSize: 15, fontWeight: '500', textAlign: 'center'},
  navItemTextActive: {color: '#fff', fontWeight: '600'},
  sidebarFooter: {paddingHorizontal: 10, marginTop: 12},
  logoutBtn: {borderRadius: 8, paddingVertical: 12, alignItems: 'center', backgroundColor: '#d93636'},
  logoutText: {color: '#fff', fontSize: 15, fontWeight: '600'},
});

