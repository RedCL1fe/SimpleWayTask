import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Select, Tag, App, Typography,
  Spin, Empty, Popconfirm, Row, Col, Statistic, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, ThunderboltOutlined, CheckCircleOutlined,
  WarningOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estimatesApi } from '../api/projects';
import { catalogApi } from '../api/catalog';
import ConfidenceBadge from '../components/ConfidenceBadge';
import type { EstimatePosition, ProductShort } from '../types';

const { Title, Text } = Typography;

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [matching, setMatching] = useState(false);

  const estimateId = Number(id);

  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['estimate', estimateId],
    queryFn: () => estimatesApi.get(estimateId),
    select: (res) => res.data,
    enabled: !!estimateId,
  });

  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: ['estimate-positions', estimateId, page],
    queryFn: () => estimatesApi.positions(estimateId, { page, page_size: 50 }),
    select: (res) => res.data,
    enabled: !!estimateId,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-short'],
    queryFn: () => catalogApi.listShort(),
    select: (res) => res.data.results,
  });

  const autoMatchMutation = useMutation({
    mutationFn: () => estimatesApi.autoMatch(estimateId),
    onMutate: () => setMatching(true),
    onSuccess: () => {
      message.success('Авто-сопоставление запущено! Обновите страницу через несколько секунд.');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['estimate-positions'] });
        queryClient.invalidateQueries({ queryKey: ['estimate'] });
        setMatching(false);
      }, 3000);
    },
    onError: (err: any) => {
      setMatching(false);
      message.error(err?.response?.data?.error || 'Ошибка сопоставления');
    },
  });

  const manualMatchMutation = useMutation({
    mutationFn: ({ posId, productId }: { posId: number; productId: number | null }) =>
      estimatesApi.manualMatch(posId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-positions'] });
      queryClient.invalidateQueries({ queryKey: ['estimate'] });
      message.success('Сопоставление обновлено');
    },
  });

  if (estimateLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!estimate) {
    return <Empty description="Смета не найдена" />;
  }

  const matchedCount = positionsData?.results?.filter(
    (p: EstimatePosition) => p.match_type !== 'none'
  ).length ?? 0;

  const totalPositions = positionsData?.count ?? 0;

  const productOptions = (productsData ?? []).map((p: ProductShort) => ({
    value: p.id,
    label: p.label,
  }));

  const columns = [
    {
      title: '№',
      dataIndex: 'row_number',
      key: 'row_number',
      width: 60,
      fixed: 'left' as const,
    },
    {
      title: 'Наименование',
      dataIndex: 'original_name',
      key: 'original_name',
      width: 280,
      render: (name: string) => (
        <Tooltip title={name}>
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Артикул',
      dataIndex: 'original_article',
      key: 'original_article',
      width: 120,
      render: (art: string) =>
        art ? <Tag color="blue">{art}</Tag> : <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Ед.',
      dataIndex: 'unit',
      key: 'unit',
      width: 70,
    },
    {
      title: 'Кол-во',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      render: (qty: number) => qty?.toLocaleString('ru-RU'),
    },
    {
      title: 'Цена мат.',
      dataIndex: 'material_price',
      key: 'material_price',
      width: 110,
      render: (price: number | null) =>
        price !== null ? `${price.toLocaleString('ru-RU')} ₽` : '—',
    },
    {
      title: 'Цена монт.',
      dataIndex: 'installation_price',
      key: 'installation_price',
      width: 110,
      render: (price: number | null) =>
        price !== null ? `${price.toLocaleString('ru-RU')} ₽` : '—',
    },
    {
      title: 'Сопоставление',
      key: 'matching',
      width: 280,
      render: (_: any, record: EstimatePosition) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Выберите товар..."
          value={record.matched_product || undefined}
          onChange={(val) =>
            manualMatchMutation.mutate({ posId: record.id, productId: val ?? null })
          }
          options={productOptions}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          allowClear
          size="small"
        />
      ),
    },
    {
      title: 'Уверенность',
      key: 'confidence',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: EstimatePosition) => (
        <ConfidenceBadge
          confidence={record.confidence}
          matchType={record.match_type}
        />
      ),
    },
  ];

  return (
    <div className="fade-in">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 8 }}
      >
        Назад
      </Button>

      <div className="page-header">
        <h1>Смета: {estimate.name || estimate.original_filename}</h1>
        <p>Сопоставление позиций с каталогом товаров</p>
      </div>

      <Row gutter={16} className="stats-row">
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title={<span className="stat-label">Позиций</span>}
              value={totalPositions}
              valueStyle={{ fontSize: 28, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title={<span className="stat-label">Сопоставлено</span>}
              value={estimate.matched_count || 0}
              suffix={`/ ${estimate.positions_count || 0}`}
              valueStyle={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title={<span className="stat-label">Не сопоставлено</span>}
              value={(estimate.positions_count || 0) - (estimate.matched_count || 0)}
              valueStyle={{
                fontSize: 28, fontWeight: 700,
                color: (estimate.positions_count || 0) - (estimate.matched_count || 0) > 0
                  ? '#ef4444' : '#22c55e',
              }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ cursor: 'pointer' }} onClick={() => autoMatchMutation.mutate()}>
            <div style={{ textAlign: 'center' }}>
              <ThunderboltOutlined
                style={{ fontSize: 32, color: '#6366f1', marginBottom: 8 }}
                className={matching ? 'pulse' : ''}
              />
              <div style={{ fontWeight: 600, color: '#6366f1' }}>
                {matching ? 'Сопоставляю...' : 'ИИ-сопоставление'}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Нажмите для запуска
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="content-card">
        <Table
          columns={columns}
          dataSource={positionsData?.results}
          rowKey="id"
          loading={positionsLoading || matching}
          scroll={{ x: 1400 }}
          rowClassName={(record: EstimatePosition) => {
            if (record.match_type === 'manual') return 'row-matched-manual';
            if (record.match_type === 'auto') return 'row-matched-auto';
            return 'row-unmatched';
          }}
          pagination={{
            current: page,
            total: positionsData?.count,
            pageSize: 50,
            onChange: setPage,
            showTotal: (total) => `Всего: ${total} позиций`,
          }}
        />
      </Card>
    </div>
  );
}
