import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Table, Tag, Space, Typography, Spin, App, Empty,
} from 'antd';
import {
  ArrowLeftOutlined, UploadOutlined, EyeOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, estimatesApi } from '../api/projects';
import UploadWizard from '../components/UploadWizard';
import type { Estimate } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const estimateFields = [
  { key: 'name', label: 'Наименование', required: true },
  { key: 'article', label: 'Артикул' },
  { key: 'unit', label: 'Ед. изм.' },
  { key: 'quantity', label: 'Количество', required: true },
  { key: 'material_price', label: 'Цена материалов' },
  { key: 'installation_price', label: 'Цена монтажа' },
];

const statusColors: Record<string, string> = {
  uploaded: 'default',
  processing: 'processing',
  done: 'success',
  error: 'error',
};

const statusLabels: Record<string, string> = {
  uploaded: 'Загружена',
  processing: 'В обработке',
  done: 'Готова',
  error: 'Ошибка',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);

  const projectId = Number(id);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    select: (res) => res.data,
    enabled: !!projectId,
  });

  const handleWizardComplete = () => {
    setShowWizard(false);
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    message.success('Смета обработана!');
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return <Empty description="Проект не найден" />;
  }

  if (showWizard) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <h1>Загрузка сметы</h1>
          <p>Проект: {project.name}</p>
        </div>
        <Button onClick={() => setShowWizard(false)} style={{ marginBottom: 16 }}>
          ← Назад к проекту
        </Button>
        <UploadWizard
          fields={estimateFields}
          onUpload={async (file) => {
            const res = await estimatesApi.upload(projectId, file);
            return res.data.id;
          }}
          onPreview={async (id, startRow, startCol) => {
            const res = await estimatesApi.preview(id, startRow, startCol);
            return res.data;
          }}
          onParse={async (id, mapping, startRow, startCol) => {
            await estimatesApi.parse(id, mapping, startRow, startCol);
          }}
          onStatus={async (id) => {
            const res = await estimatesApi.status(id);
            return res.data;
          }}
          onComplete={handleWizardComplete}
        />
      </div>
    );
  }

  const columns = [
    {
      title: 'Файл',
      dataIndex: 'original_filename',
      key: 'original_filename',
      render: (name: string) => (
        <Space>
          <FileExcelOutlined style={{ color: '#22c55e' }} />
          <strong>{name}</strong>
        </Space>
      ),
    },
    { title: 'Название', dataIndex: 'name', key: 'name' },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: 'Позиций',
      dataIndex: 'positions_count',
      key: 'positions_count',
      width: 90,
    },
    {
      title: 'Сопоставлено',
      key: 'matched',
      width: 140,
      render: (_: any, record: Estimate) => {
        if (!record.positions_count) return '—';
        return (
          <Tag color={record.matched_count === record.positions_count ? 'success' : 'warning'}>
            {record.matched_count} / {record.positions_count}
          </Tag>
        );
      },
    },
    {
      title: 'Дата',
      dataIndex: 'upload_date',
      key: 'upload_date',
      width: 140,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: Estimate) =>
        record.status === 'done' && (
          <Button
            type="primary"
            ghost
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/estimates/${record.id}`)}
          >
            Открыть
          </Button>
        ),
    },
  ];

  return (
    <div className="fade-in">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/projects')}
        style={{ marginBottom: 8 }}
      >
        Все проекты
      </Button>

      <div className="page-header">
        <h1>{project.name}</h1>
        <p>{project.description || 'Нет описания'}</p>
      </div>

      <Card
        className="content-card"
        title="Сметы проекта"
        extra={
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setShowWizard(true)}
            style={{ borderRadius: 10 }}
          >
            Загрузить смету
          </Button>
        }
      >
        {project.estimates?.length ? (
          <Table
            columns={columns}
            dataSource={project.estimates}
            rowKey="id"
            pagination={false}
          />
        ) : (
          <Empty description="Пока нет смет. Загрузите первую!" />
        )}
      </Card>
    </div>
  );
}
