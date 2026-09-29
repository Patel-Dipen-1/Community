import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
  return <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>{icon}</Text>;
};

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => getTabIcon(route.name, focused),
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#818cf8',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
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
