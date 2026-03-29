import { useState } from 'react';
import { ConfigProvider, Layout, Menu, theme } from 'antd';
import { AgentPage } from './pages/AgentPage';
import { AgentConfigPage } from './pages/AgentConfigPage';
import { AgentConfigPageV3 } from './pages/AgentConfigPageV3';
import { MemoryPage } from './pages/MemoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatPage } from './pages/ChatPage';
import { SkillsPage } from './pages/SkillsPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const BotIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3m9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3"/>
  </svg>
);

const DatabaseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3m9 3c1.66 0 9 1.34 9 3m0-6c0 1.66-4 3-9 3s-9-1.34-9-3"/>
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-1.42 3.42 2 2 0 01-1.42-.59l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-3.42-1.42 2 2 0 01.59-1.42l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 011.42-3.42 2 2 0 011.42.59l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 013.42 1.42 2 2 0 01-.59 1.42l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm0 14H6l-2 2V4h16v12z"/>
  </svg>
);

const SkillsIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
);

const ConfigIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.485.485 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

const { Header, Sider, Content } = Layout;

function App() {
  const [currentPage, setCurrentPage] = useState('agents');
  const [darkMode, setDarkMode] = useState(false);

  const menuItems = [
    { key: 'agents', icon: <BotIcon />, label: 'Agent 编排' },
    { key: 'agent-config', icon: <ConfigIcon />, label: 'Agent 配置' },
    { key: 'agent-config-v3', icon: <ConfigIcon />, label: 'Agent 配置 V3' },
    { key: 'chat', icon: <ChatIcon />, label: '对话' },
    { key: 'skills', icon: <SkillsIcon />, label: 'Skills' },
    { key: 'memory', icon: <DatabaseIcon />, label: '记忆' },
    { key: 'settings', icon: <SettingsIcon />, label: '设置' },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'agents': return <AgentPage />;
      case 'agent-config': return <AgentConfigPage />;
      case 'agent-config-v3': return <AgentConfigPageV3 />;
      case 'chat': return <ChatPage />;
      case 'skills': return <SkillsPage />;
      case 'memory': return <MemoryPage />;
      case 'settings': return <SettingsPage />;
      default: return <AgentPage />;
    }
  };

  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: { colorPrimary: '#1890ff' },
        }}
      >
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>🦊 ClawTeamHarness</div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {darkMode ? '🌞' : '🌙'}
            </button>
          </Header>
          <Layout>
            <Sider width={200} style={{ background: darkMode ? '#141414' : '#fff' }}>
              <Menu
                mode="inline"
                selectedKeys={[currentPage]}
                onClick={({ key }) => setCurrentPage(key)}
                items={menuItems}
                style={{ height: '100%', borderRight: 0 }}
              />
            </Sider>
            <Content style={{ padding: '24px', minHeight: 280 }}>
              {renderPage()}
            </Content>
          </Layout>
        </Layout>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
