import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from '../types/navigation.types';
import { HomeScreen } from '../screens/main/HomeScreen';
import { ChatsScreen } from '../screens/main/ChatsScreen';
import { CategoriesScreen } from '../screens/main/CategoriesScreen';
import { StoreScreen } from '../screens/main/StoreScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const getTabIcon = (routeName: keyof MainTabParamList, focused: boolean) => {
  let icon = '🏠';
  switch (routeName) {
    case 'Home':
      icon = '🏠';
      break;
    case 'Chats':
      icon = '💬';
      break;
    case 'Categories':
      icon = '🏷️';
      break;
    case 'Store':
      icon = '🏪';
      break;
    case 'Profile':
      icon = '👤';
      break;
  }
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{icon}</Text>;
};

export const MainNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom || 0;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => getTabIcon(route.name, focused),
        tabBarStyle: {
          backgroundColor: '#0b1120',
          borderTopColor: '#1e293b',
          borderTopWidth: 1,
          height: 58 + bottomInset,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#818cf8',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Chats" component={ChatsScreen} options={{ title: 'Chats' }} />
      <Tab.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Categories' }} />
      <Tab.Screen name="Store" component={StoreScreen} options={{ title: 'Store' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};
