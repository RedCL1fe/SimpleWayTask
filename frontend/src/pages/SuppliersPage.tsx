import { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space,
  Card, Popconfirm, App, Row, Col, Statistic, Tag, Typography
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, ShopOutlined, OrderedListOutlined, InfoCircleOutlined, IdcardOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '../api/suppliers';
import type { Supplier } from '../types';

import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

const currencyLabels: Record<string, string> = {
  RUB: '₽ Рубль',
  USD: '$ Доллар',
  EUR: '€ Евро',
  CNY: '¥ Юань',
};

export default function SuppliersPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [infoSupplier, setInfoSupplier] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search, page],
    queryFn: () => suppliersApi.list({ search, page }),
    select: (res) => res.data,
  });

  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: (values: Partial<Supplier>) => suppliersApi.create(values),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      message.success('Поставщик создан');
      closeModal();
      
      Modal.confirm({
        title: 'Поставщик успешно создан',
        content: 'Хотите сразу загрузить для него прайс-лист (Excel)?',
        okText: 'Да, загрузить',
        cancelText: 'Позже',
        onOk: () => navigate(`/pricelists?supplier=${res.data.id}`)
      });
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
    mutationFn: ({ id, values }: { id: number; values: Partial<Supplier> }) =>
      suppliersApi.update(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      message.success('Поставщик обновлён');
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => suppliersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      message.success('Поставщик удалён');
    },
  });

  const openCreate = () => {
    setEditingSupplier(null);
    form.resetFields();
    form.setFieldsValue({ currency: 'RUB' });
    setModalOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.setFieldsValue(supplier);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSupplier(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Supplier) => (
        <Space>
          <a onClick={(e) => { e.preventDefault(); navigate(`/pricelists?supplier=${record.id}`); }}>
            <strong>{name}</strong>
          </a>
          <Button 
            type="text" 
            size="small" 
            icon={<InfoCircleOutlined style={{ color: '#64748b' }} />} 
            onClick={(e) => { e.stopPropagation(); setInfoSupplier(record); }}
            title="Информация о поставщике"
          />
        </Space>
      ),
    },
    { title: 'ИНН', dataIndex: 'inn', key: 'inn', width: 140 },
    {
      title: 'Валюта',
      dataIndex: 'currency',
      key: 'currency',
      width: 120,
      render: (cur: string) => (
        <Tag color={cur === 'RUB' ? 'blue' : cur === 'USD' ? 'green' : 'purple'}>
          {currencyLabels[cur] || cur}
        </Tag>
      ),
    },
    {
      title: 'Контакт',
      dataIndex: 'contact_person',
      key: 'contact_person',
      width: 180,
    },
    {
      title: 'Прайсы',
      dataIndex: 'pricelists_count',
      key: 'pricelists_count',
      width: 100,
      render: (cnt: number) => (
        <Tag color={cnt > 0 ? 'geekblue' : 'default'}>{cnt}</Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: any, record: Supplier) => (
        <Space>
          <Button
            type="text"
            icon={<OrderedListOutlined />}
            onClick={(e) => { e.stopPropagation(); navigate(`/pricelists?supplier=${record.id}`); }}
            title="Перейти к прайс-листу"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); openEdit(record); }}
          />
          <div onClick={(e) => e.stopPropagation()}>
            <Popconfirm
              title="Удалить поставщика?"
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Поставщики</h1>
        <p>Управление поставщиками и их прайс-листами</p>
      </div>

      <Row gutter={16} className="stats-row">
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title={<span className="stat-label">Всего</span>}
              value={data?.count || 0}
              prefix={<ShopOutlined />}
              valueStyle={{ fontSize: 28, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="content-card">
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="Поиск по названию или ИНН..."
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
            Добавить поставщика
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={data?.results}
          rowKey="id"
          loading={isLoading}
          onRow={(record) => ({
            onClick: () => navigate(`/pricelists?supplier=${record.id}`),
            style: { cursor: 'pointer' }
          })}
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
        title={editingSupplier ? 'Редактировать поставщика' : 'Новый поставщик'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        okText={editingSupplier ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="ООО «Поставщик»" />
          </Form.Item>
          <Form.Item
            name="inn"
            label="ИНН"
            rules={[{ required: true, message: 'Введите ИНН' }]}
          >
            <Input placeholder="1234567890" maxLength={12} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contact_person" label="Контактное лицо">
                <Input placeholder="Иванов Иван" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Телефон">
                <Input placeholder="+7 (999) 123-45-67" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="supplier@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currency" label="Валюта">
                <Select
                  options={[
                    { value: 'RUB', label: '₽ Рубль' },
                    { value: 'USD', label: '$ Доллар' },
                    { value: 'EUR', label: '€ Евро' },
                    { value: 'CNY', label: '¥ Юань' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <IdcardOutlined style={{ color: '#6366f1' }} />
            Карточка поставщика
          </Space>
        }
        open={!!infoSupplier}
        onCancel={() => setInfoSupplier(null)}
        footer={[
          <Button key="close" onClick={() => setInfoSupplier(null)}>
            Закрыть
          </Button>
        ]}
      >
        {infoSupplier && (
          <div style={{ marginTop: 16 }}>
             <Typography.Paragraph>
               <Text type="secondary" style={{ display: 'block', marginBottom: 2 }}>Название:</Text>
               <Text strong copyable style={{ fontSize: 16 }}>{infoSupplier.name}</Text>
             </Typography.Paragraph>
             <Typography.Paragraph>
               <Text type="secondary" style={{ display: 'block', marginBottom: 2 }}>ИНН:</Text>
               <Text strong copyable style={{ fontSize: 16 }}>{infoSupplier.inn}</Text>
             </Typography.Paragraph>
             {infoSupplier.contact_person && (
                <Typography.Paragraph>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2 }}>Контактное лицо:</Text>
                  <Text strong copyable style={{ fontSize: 16 }}>{infoSupplier.contact_person}</Text>
                </Typography.Paragraph>
             )}
             {infoSupplier.phone && (
                <Typography.Paragraph>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2 }}>Телефон:</Text>
                  <Text strong copyable style={{ fontSize: 16 }}>{infoSupplier.phone}</Text>
                </Typography.Paragraph>
             )}
             {infoSupplier.email && (
                <Typography.Paragraph>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2 }}>Email:</Text>
                  <Text strong copyable style={{ fontSize: 16 }}>{infoSupplier.email}</Text>
                </Typography.Paragraph>
             )}
          </div>
        )}
      </Modal>
    </div>
  );
}
