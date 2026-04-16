import { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Space,
  Card, Popconfirm, App, Row, Col, Statistic, Typography,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ProjectOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import type { Project } from '../types';
import dayjs from 'dayjs';

export default function ProjectsPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['projects', page],
    queryFn: () => projectsApi.list({ page }),
    select: (res) => res.data,
  });

  const createMutation = useMutation({
    mutationFn: (values: Partial<Project>) => projectsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Проект создан');
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: Partial<Project> }) =>
      projectsApi.update(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Проект обновлён');
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Проект удалён');
    },
  });

  const openCreate = () => {
    setEditingProject(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue(project);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProject(null);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Project) => (
        <Button type="link" onClick={() => navigate(`/projects/${record.id}`)}>
          <strong>{name}</strong>
        </Button>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Смет',
      dataIndex: 'estimates_count',
      key: 'estimates_count',
      width: 80,
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 140,
      render: (_: any, record: Project) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/projects/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title="Удалить проект?"
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
        <h1>Проекты</h1>
        <p>Управление проектами и сметами</p>
      </div>

      <Row gutter={16} className="stats-row">
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title={<span className="stat-label">Проектов</span>}
              value={data?.count || 0}
              prefix={<ProjectOutlined />}
              valueStyle={{ fontSize: 28, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="content-card">
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{ borderRadius: 10 }}
          >
            Новый проект
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
          }}
        />
      </Card>

      <Modal
        title={editingProject ? 'Редактировать проект' : 'Новый проект'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        okText={editingProject ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Объект: Жилой комплекс «Рассвет»" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Описание проекта..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
