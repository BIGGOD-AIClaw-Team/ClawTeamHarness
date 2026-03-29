import React from 'react';
import { Layout, Menu } from 'antd';
import { BotOutlined, ApiOutlined, DatabaseOutlined, SettingOutlined } from '@ant-design/icons';
import { AgentPage } from './pages/AgentPage';
import { APIPage } from './pages/APIPage';
import { MemoryPage } from './pages/MemoryPage';
import { SettingsPage } from './pages/SettingsPage';

const { Header, Sider, Content } = Layout;

function App() {
  const [currentPage, setCurrentPage] = React.useState('agents');

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
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
        🦊 ClawTeamHarness
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
        <Content style={{ padding: '24px', background: '#fff', minHeight: 280 }}>
          {renderPage()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
