import { useState } from 'react';
import { ConfigProvider, Layout, Menu, theme } from 'antd';
import { AgentPage } from './pages/AgentPage';
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

const { Header, Sider, Content } = Layout;

function App() {
  const [currentPage, setCurrentPage] = useState('agents');
  const [darkMode, setDarkMode] = useState(false);

  const menuItems = [
    { key: 'agents', icon: <BotIcon />, label: 'Agent 编排' },
    { key: 'chat', icon: <ChatIcon />, label: '对话' },
    { key: 'skills', icon: <SkillsIcon />, label: 'Skills' },
    { key: 'memory', icon: <DatabaseIcon />, label: '记忆' },
    { key: 'settings', icon: <SettingsIcon />, label: '设置' },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'agents': return <AgentPage />;
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
