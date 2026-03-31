import { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Menu, theme } from 'antd';
import { AgentConfigPageV3 } from './pages/AgentConfigPageV3';
import { MemoryPage } from './pages/MemoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatPage } from './pages/ChatPage';
import { APIPage } from './pages/APIPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { MultiAgentPage } from './pages/MultiAgentPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const { Header, Sider, Content } = Layout;

// ============================================================
// Icon Components
// ============================================================

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

const ConfigIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.485.485 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

const ThunderIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
  </svg>
);

const TeamIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

// Collapse/Expand Icon
const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg 
    viewBox="0 0 24 24" 
    width="16" 
    height="16" 
    fill="currentColor"
    style={{ 
      transition: 'transform 0.2s ease-in-out',
      transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
    }}
  >
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
  </svg>
);

// ============================================================
// Theme Configuration
// ============================================================

const sciFiTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#00d4ff',
    colorSuccess: '#00ff88',
    colorWarning: '#ffaa00',
    colorError: '#ff4757',
    colorInfo: '#7c3aed',
    colorBgBase: '#0a0e17',
    colorText: '#e0e6ed',
    colorTextSecondary: '#8b9dc3',
    colorBorder: 'rgba(0, 212, 255, 0.3)',
    colorBorderSecondary: 'rgba(0, 212, 255, 0.1)',
    colorBgContainer: 'rgba(0, 20, 40, 0.8)',
    colorBgElevated: 'rgba(0, 20, 40, 0.9)',
    colorBgLayout: '#0a0e17',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    Layout: {
      headerBg: 'linear-gradient(90deg, rgba(0, 212, 255, 0.12) 0%, rgba(124, 58, 237, 0.12) 50%, rgba(0, 255, 136, 0.08) 100%)',
      bodyBg: '#0a0e17',
      siderBg: 'rgba(0, 20, 40, 0.8)',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'linear-gradient(90deg, rgba(0, 212, 255, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%)',
      darkItemHoverBg: 'rgba(0, 212, 255, 0.08)',
      darkItemColor: '#8b9dc3',
      darkItemSelectedColor: '#00d4ff',
      darkItemInlineIndent: 24,
    },
    Card: {
      colorBgContainer: 'rgba(0, 20, 40, 0.8)',
      colorBorderSecondary: 'rgba(0, 212, 255, 0.3)',
    },
    Input: {
      colorBgContainer: 'rgba(0, 10, 20, 0.8)',
      colorBorder: 'rgba(0, 212, 255, 0.3)',
      activeBorderColor: '#00d4ff',
      hoverBorderColor: 'rgba(0, 212, 255, 0.5)',
      colorText: '#e0e6ed',
      colorPlaceholderText: '#5a6a8a',
    },
    Select: {
      colorBgContainer: 'rgba(0, 10, 20, 0.8)',
      colorBorder: 'rgba(0, 212, 255, 0.3)',
      optionSelectedBg: 'rgba(0, 212, 255, 0.2)',
      colorText: '#e0e6ed',
      colorPlaceholderText: '#5a6a8a',
    },
    Button: {
      primaryShadow: '0 0 15px rgba(0, 212, 255, 0.4)',
      defaultShadow: '0 0 10px rgba(0, 212, 255, 0.2)',
    },
    Table: {
      colorBgContainer: 'rgba(0, 20, 40, 0.8)',
      headerBg: 'rgba(0, 40, 60, 0.8)',
      rowHoverBg: 'rgba(0, 212, 255, 0.08)',
      headerColor: '#00d4ff',
    },
    Slider: {
      trackBg: '#00d4ff',
      trackHoverBg: '#00e5ff',
      handleColor: '#00d4ff',
      handleShadow: '0 0 10px rgba(0, 212, 255, 0.6)',
      railBg: 'rgba(0, 212, 255, 0.2)',
      railHoverBg: 'rgba(0, 212, 255, 0.3)',
    },
    Switch: {
      colorPrimary: '#00d4ff',
      colorPrimaryHover: '#00e5ff',
    },
    Tag: {
      defaultBg: 'rgba(0, 212, 255, 0.1)',
      defaultColor: '#00d4ff',
    },
  },
};

// ============================================================
// Main App Component
// ============================================================

function App() {
  const [currentPage, setCurrentPage] = useState('agent-config-v3');
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [chatInitialAgentId, setChatInitialAgentId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    // 从 localStorage 恢复用户偏好
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // 保存折叠状态到 localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const startEditAgent = (agentId: string) => {
    setEditingAgentId(agentId);
    setCurrentPage('agent-config-v3');
  };

  // 菜单项配置
  const menuItems = [
    { key: 'agent-config-v3', icon: <ConfigIcon />, label: '🤖 Agent 配置' },
    { key: 'chat', icon: <ChatIcon />, label: '💬 对话' },
    { key: 'memory', icon: <DatabaseIcon />, label: '🧠 记忆' },
    { key: 'skills-orchestrator', icon: <ThunderIcon />, label: '⚡ Skills 编排' },
    { key: 'multi-agent', icon: <TeamIcon />, label: '👥 多Agent协作' },
    { key: 'api', icon: <BotIcon />, label: '🔌 API' },
    { key: 'settings', icon: <SettingsIcon />, label: '⚙️ 设置' },
  ];

  const headerStyle = {
    background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
    borderBottom: '1px solid rgba(0, 212, 255, 0.3)',
    padding: '0 24px',
    height: 64,
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  };

  const siderStyle = {
    background: 'rgba(0, 20, 40, 0.8)',
    borderRight: '1px solid rgba(0, 212, 255, 0.2)',
    transition: 'all 0.2s ease-in-out',
    overflow: 'hidden' as const,
  };

  const menuStyle = {
    background: 'transparent',
    borderRight: 0,
    padding: '16px 8px',
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'agent-config-v3': return <AgentConfigPageV3 key={editingAgentId || 'new'} agentId={editingAgentId} onEditComplete={() => setEditingAgentId(null)} onPublishSuccess={(agentId) => { setChatInitialAgentId(agentId); setCurrentPage('chat'); }} />;
      case 'chat': return <ChatPage key={chatInitialAgentId || 'default'} onEditAgent={startEditAgent} initialAgentId={chatInitialAgentId} />;
      case 'memory': return <MemoryPage />;
      case 'skills-orchestrator': return <WorkflowPage />;
      case 'multi-agent': return <MultiAgentPage />;
      case 'api': return <APIPage />;
      case 'settings': return <SettingsPage />;
      default: return <AgentConfigPageV3 />;
    }
  };

  return (
    <ErrorBoundary>
      <ConfigProvider theme={sciFiTheme}>
        <Layout style={{ height: '100vh', background: '#0a0e17', overflow: 'hidden' }}>
          <Header style={headerStyle}>
            <div style={{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              color: '#00d4ff', 
              textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              🦊 ClawTeamHarness
            </div>
            <div style={{ 
              color: '#00ff88',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#00ff88',
                boxShadow: '0 0 10px #00ff88',
                animation: 'pulse 2s infinite',
              }} />
              在线
            </div>
          </Header>
          <Layout>
            <Sider 
              width={collapsed ? 64 : 220} 
              collapsedWidth={64}
              collapsed={collapsed}
              style={siderStyle}
              trigger={
                <div 
                  style={{
                    padding: '12px 0',
                    display: 'flex',
                    justifyContent: collapsed ? 'center' : 'flex-end',
                    paddingRight: collapsed ? 0 : 16,
                    cursor: 'pointer',
                    color: '#888',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#00d4ff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                  onClick={() => setCollapsed(!collapsed)}
                >
                  <CollapseIcon collapsed={collapsed} />
                </div>
              }
            >
              <Menu
                mode="inline"
                selectedKeys={[currentPage]}
                onClick={({ key }) => setCurrentPage(key)}
                items={menuItems}
                style={menuStyle}
                theme="dark"
                inlineCollapsed={collapsed}
              />
            </Sider>
            <Content style={{ padding: '24px', height: 'calc(100vh - 64px)', overflow: 'auto', background: '#0a0e17' }}>
              {renderPage()}
            </Content>
          </Layout>
        </Layout>
      </ConfigProvider>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px #00ff88; }
          50% { opacity: 0.7; box-shadow: 0 0 20px #00ff88, 0 0 30px #00ff88; }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 212, 255, 0.3) transparent;
        }
        *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        *::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 255, 0.3);
          border-radius: 3px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 212, 255, 0.5);
        }
        /* 折叠按钮样式 */
        .ant-layout-sider-trigger {
          background: rgba(0, 20, 40, 0.9) !important;
          border-top: 1px solid rgba(0, 212, 255, 0.2) !important;
        }
        /* Menu inline collapsed styles */
        .ant-menu-inline-collapsed {
          width: 64px !important;
        }
        .ant-menu-inline-collapsed .ant-menu-item,
        .ant-menu-inline-collapsed .ant-menu-submenu-title {
          padding: 0 !important;
          justify-content: center;
        }
        /* SciFi Card hover glow effect */
        .scifi-card:hover .scifi-glow-line {
          animation: glow 1.5s ease-in-out infinite;
        }
        /* Provider Select dropdown styling */
        .provider-select .ant-select-selection-item {
          color: #00d4ff;
        }
        .provider-select .ant-select-item-option-selected {
          background: linear-gradient(90deg, rgba(0, 212, 255, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%) !important;
        }
        /* Button hover effects */
        .ant-btn:not(:disabled):hover {
          box-shadow: 0 0 20px rgba(0, 212, 255, 0.4) !important;
          transform: translateY(-1px);
        }
        .ant-btn:not(:disabled):active {
          transform: translateY(0);
        }
        /* Ant Input/Select focus glow */
        .ant-input:focus,
        .ant-input-focused,
        .ant-select-focused .ant-select-selector {
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.3) !important;
        }
        /* Slider track glow */
        .ant-slider-track {
          box-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
        }
        .ant-slider-handle {
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.6) !important;
        }
        /* Tag hover effect */
        .ant-tag {
          transition: all 0.2s ease;
        }
        .ant-tag:hover {
          box-shadow: 0 0 10px currentColor;
          transform: scale(1.02);
        }
        /* Menu item hover with gradient */
        .ant-menu-item:not(.ant-menu-item-selected):hover {
          background: linear-gradient(90deg, rgba(0, 212, 255, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%) !important;
        }
        .ant-menu-item-selected {
          background: linear-gradient(90deg, rgba(0, 212, 255, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%) !important;
          border-right: 3px solid #00d4ff !important;
        }
      `}</style>
    </ErrorBoundary>
  );
}

export default App;
