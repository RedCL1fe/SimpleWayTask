import { useState, useEffect } from 'react';
import {
  Steps, Button, Upload, Space, Result, Progress, Typography, Card, App,
} from 'antd';
import {
  UploadOutlined, InboxOutlined, PlayCircleOutlined,
  CheckCircleOutlined, LoadingOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import type { PreviewData, ParseStatus } from '../types';
import PreviewTable from './PreviewTable';
import ColumnMapper from './ColumnMapper';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface UploadWizardProps {
  /** Поля для маппинга */
  fields: { key: string; label: string; required?: boolean }[];
  /** Функция загрузки файла, возвращает id созданной сущности */
  onUpload: (file: File) => Promise<number>;
  /** Функция получения превью по id */
  onPreview: (id: number) => Promise<PreviewData>;
  /** Функция запуска парсинга */
  onParse: (id: number, mapping: Record<string, string>) => Promise<void>;
  /** Функция получения статуса парсинга */
  onStatus: (id: number) => Promise<ParseStatus>;
  /** Callback после завершения */
  onComplete?: () => void;
}

export default function UploadWizard({
  fields,
  onUpload,
  onPreview,
  onParse,
  onStatus,
  onComplete,
}: UploadWizardProps) {
  const { message } = App.useApp();
  const [current, setCurrent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [entityId, setEntityId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parseStatus, setParseStatus] = useState<ParseStatus | null>(null);
  const [polling, setPolling] = useState(false);

  // Polling для статуса парсинга
  useEffect(() => {
    if (!polling || !entityId) return;

    const interval = setInterval(async () => {
      try {
        const status = await onStatus(entityId);
        setParseStatus(status);

        if (status.status === 'done') {
          setPolling(false);
          setCurrent(3);
          message.success('Парсинг завершён успешно!');
        } else if (status.status === 'error') {
          setPolling(false);
          message.error(`Ошибка парсинга: ${status.error_message}`);
        }
      } catch {
        setPolling(false);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [polling, entityId]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const id = await onUpload(file);
      setEntityId(id);

      const preview = await onPreview(id);
      setPreviewData(preview);

      setCurrent(1);
      message.success('Файл загружен, настройте маппинг колонок');
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const handleParse = async () => {
    if (!entityId) return;

    const requiredMissing = fields
      .filter((f) => f.required)
      .some((f) => !mapping[f.key]);

    if (requiredMissing) {
      message.warning('Заполните все обязательные поля маппинга');
      return;
    }

    try {
      await onParse(entityId, mapping);
      setCurrent(2);
      setPolling(true);
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Ошибка запуска парсинга');
    }
  };

  const steps = [
    {
      title: 'Загрузка файла',
      content: (
        <div className="fade-in">
          <Dragger
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={(file) => {
              handleUpload(file);
              return false;
            }}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              {uploading ? <LoadingOutlined style={{ fontSize: 48 }} /> : <InboxOutlined style={{ fontSize: 48, color: '#6366f1' }} />}
            </p>
            <p style={{ fontSize: 16, fontWeight: 500, color: '#0f172a' }}>
              {uploading ? 'Загрузка...' : 'Перетащите Excel-файл сюда'}
            </p>
            <p style={{ color: '#64748b' }}>
              Поддерживаются форматы .xlsx и .xls
            </p>
          </Dragger>
        </div>
      ),
    },
    {
      title: 'Настройка колонок',
      content: previewData && (
        <div className="fade-in">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={5} style={{ marginBottom: 4 }}>Превью данных</Title>
              <Text type="secondary">Первые {previewData.total_preview_rows} строк файла</Text>
              <div style={{ marginTop: 12 }}>
                <PreviewTable data={previewData} />
              </div>
            </div>

            <div>
              <Title level={5} style={{ marginBottom: 4 }}>Маппинг колонок</Title>
              <Text type="secondary">Укажите, какая колонка Excel соответствует каждому полю</Text>
              <div style={{ marginTop: 12 }}>
                <ColumnMapper
                  columns={previewData.columns}
                  fields={fields}
                  mapping={mapping}
                  onChange={setMapping}
                />
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleParse}
              style={{ borderRadius: 10 }}
            >
              Запустить парсинг
            </Button>
          </Space>
        </div>
      ),
    },
    {
      title: 'Парсинг',
      content: (
        <div className="fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
          <LoadingOutlined style={{ fontSize: 48, color: '#6366f1' }} className="pulse" />
          <Title level={4} style={{ marginTop: 24 }}>Парсинг данных...</Title>
          <Text type="secondary">Данные обрабатываются в фоне</Text>
          {parseStatus && (
            <div style={{ maxWidth: 400, margin: '24px auto' }}>
              <Progress
                percent={parseStatus.progress}
                status="active"
                strokeColor={{ from: '#6366f1', to: '#8b5cf6' }}
                strokeWidth={12}
                style={{ borderRadius: 8 }}
              />
              <Text type="secondary">
                {parseStatus.processed_rows} / {parseStatus.total_rows} строк
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Готово',
      content: (
        <div className="fade-in">
          <Result
            status="success"
            title="Парсинг завершён!"
            subTitle={
              parseStatus
                ? `Обработано ${parseStatus.total_rows} строк`
                : 'Данные успешно загружены'
            }
            extra={
              <Button type="primary" onClick={onComplete} style={{ borderRadius: 10 }}>
                Перейти к данным
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  return (
    <Card className="content-card" style={{ padding: '16px 8px' }}>
      <Steps
        current={current}
        className="wizard-steps"
        items={steps.map((s) => ({ title: s.title }))}
      />
      <div style={{ marginTop: 24 }}>{steps[current].content}</div>
    </Card>
  );
}
