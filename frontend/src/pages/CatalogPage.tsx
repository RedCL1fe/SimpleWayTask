import { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Space,
  Card, Popconfirm, App, Row, Col, Statistic, Tag,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '../api/catalog';
import type { Product } from '../types';

export default function CatalogPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, page],
    queryFn: () => catalogApi.list({ search, page }),
    select: (res) => res.data,
  });

  const createMutation = useMutation({
    mutationFn: (values: Partial<Product>) => catalogApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      message.success('Товар добавлен в каталог');
      closeModal();
    },
    onError: (err: any) => {
      const detail = err?.response?.data;
      message.error(
        typeof detail === 'object'
          ? Object.values(detail).flat().join(', ')
          : 'Ошибка создания'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: Partial<Product> }) =>
      catalogApi.update(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      message.success('Товар обновлён');
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => catalogApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      message.success('Товар удалён');
    },
  });

  const openCreate = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: 'Артикул',
      dataIndex: 'article',
      key: 'article',
      width: 140,
      render: (article: string) => <Tag color="blue">{article}</Tag>,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <strong>{name}</strong>,
    },
    { title: 'Ед. изм.', dataIndex: 'unit', key: 'unit', width: 100 },
    {
      title: 'Группа',
      dataIndex: 'group',
      key: 'group',
      width: 180,
      render: (group: string) =>
        group ? <Tag>{group}</Tag> : <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: any, record: Product) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Удалить товар?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Каталог товаров</h1>
        <p>Общий каталог для сопоставления с прайсами и сметами</p>
      </div>

      <Row gutter={16} className="stats-row">
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title={<span className="stat-label">Товаров</span>}
              value={data?.count || 0}
              prefix={<AppstoreOutlined />}
              valueStyle={{ fontSize: 28, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="content-card">
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="Поиск по артикулу или названию..."
            style={{ width: 320 }}
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{ borderRadius: 10 }}
          >
            Добавить товар
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={data?.results}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total: data?.count,
            pageSize: 25,
            onChange: setPage,
            showTotal: (total) => `Всего: ${total}`,
          }}
        />
      </Card>

      <Modal
        title={editingProduct ? 'Редактировать товар' : 'Новый товар'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        okText={editingProduct ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="article"
            label="Артикул"
            rules={[{ required: true, message: 'Введите артикул' }]}
          >
            <Input placeholder="ABC-12345" />
          </Form.Item>
          <Form.Item
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Введите наименование' }]}
          >
            <Input placeholder="Кабель ВВГнг 3x1.5" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Ед. изм."
                rules={[{ required: true, message: 'Введите единицу' }]}
              >
                <Input placeholder="м, шт, кг, п.м." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="group" label="Группа">
                <Input placeholder="Кабельная продукция" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
