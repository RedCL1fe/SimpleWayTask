import { Layout, Menu } from 'antd';
import {
  ShopOutlined,
  FileExcelOutlined,
  AppstoreOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/suppliers', icon: <ShopOutlined />, label: 'Поставщики' },
  { key: '/pricelists', icon: <FileExcelOutlined />, label: 'Прайс-листы' },
  { key: '/catalog', icon: <AppstoreOutlined />, label: 'Каталог' },
  { key: '/projects', icon: <ProjectOutlined />, label: 'Проекты' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = menuItems.find((item) =>
    location.pathname.startsWith(item.key)
  )?.key || '/suppliers';

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">📊</div>
          <span>PriceSystem</span>
        </div>
      </Header>
      <Layout>
        <Sider width={220} theme="dark" breakpoint="lg" collapsedWidth="80">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ marginTop: 8, border: 'none' }}
          />
        </Sider>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
