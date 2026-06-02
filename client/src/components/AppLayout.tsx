import { Layout, Menu, Button, Typography, Space } from 'antd'
import {
  UserOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: '/clients', icon: <UserOutlined />, label: 'Clients' },
  { key: '/projects', icon: <ProjectOutlined />, label: 'Projects' },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Tasks' },
  { key: '/notes', icon: <FileTextOutlined />, label: 'Notes' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ padding: '16px', color: 'white', fontWeight: 'bold', fontSize: 16 }}>
          CRM
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
        <div style={{ position: 'absolute', bottom: 16, width: '100%', padding: '0 16px' }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            style={{ color: 'rgba(255,255,255,0.65)', width: '100%', textAlign: 'left' }}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Space>
            <Typography.Text type="secondary">{user?.email}</Typography.Text>
            <Typography.Text strong>{user?.name}</Typography.Text>
          </Space>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
