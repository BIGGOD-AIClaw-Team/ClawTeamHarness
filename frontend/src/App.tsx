import React, { useState } from 'react';
import { ConfigProvider, Layout, Menu, theme } from 'antd';
import { BotOutlined, ApiOutlined, DatabaseOutlined, SettingOutlined } from '@ant-design/icons';
import { AgentPage } from './pages/AgentPage';
import { APIPage } from './pages/APIPage';
import { MemoryPage } from './pages/MemoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const { Header, Sider, Content } = Layout;

function App() {
  const [currentPage, setCurrentPage] = useState('agents');
  const [darkMode, setDarkMode] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'agents': return <AgentPage />;
      case 'api': return <APIPage />;
      case 'memory': return <MemoryPage />;
      case 'settings': return <SettingsPage />;
      default: return <AgentPage />;
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <ErrorBoundary>
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{ color: 'white', fontSize: 18, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🦊 ClawTeamHarness</span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
            >
              {darkMode ? '🌞' : '🌙'}
            </button>
          </Header>
          <Layout>
            <Sider width={200}>
              <Menu mode="inline" onClick={({key}) => setCurrentPage(key)}>
                <Menu.Item key="agents" icon={<BotOutlined />}>Agent 编排</Menu.Item>
                <Menu.Item key="api" icon={<ApiOutlined />}>API</Menu.Item>
                <Menu.Item key="memory" icon={<DatabaseOutlined />}>记忆</Menu.Item>
                <Menu.Item key="settings" icon={<SettingOutlined />}>设置</Menu.Item>
              </Menu>
            </Sider>
            <Content style={{ padding: '24px', minHeight: 280 }}>
              {renderPage()}
            </Content>
          </Layout>
        </Layout>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;
