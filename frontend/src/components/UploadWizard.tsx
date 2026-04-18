import { useState, useEffect } from 'react';
import {
  Steps, Button, Upload, Space, Result, Progress, Typography, Card, App, InputNumber
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
  /** Опционально: ID уже созданного прайса (для старта со 2 шага) */
  initialPricelistId?: number;
  /** Поля для маппинга */
  fields: { key: string; label: string; required?: boolean }[];
  /** Функция загрузки файла, возвращает id созданной сущности */
  onUpload: (file: File) => Promise<number>;
  /** Функция получения превью по id */
  onPreview: (id: number, startRow?: number, startColumn?: number) => Promise<PreviewData>;
  /** Функция запуска парсинга */
  onParse: (id: number, mapping: Record<string, string>, startRow?: number, startColumn?: number) => Promise<void>;
  /** Функция получения статуса парсинга */
  onStatus: (id: number) => Promise<ParseStatus>;
  /** Callback после завершения */
  onComplete?: () => void;
}

export default function UploadWizard({
  initialPricelistId,
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
  const [startRow, setStartRow] = useState<number>(1);
  const [startColumn, setStartColumn] = useState<number>(1);

  useEffect(() => {
    if (initialPricelistId) {
      setEntityId(initialPricelistId);
      // При продолжении получаем текущие настройки прайса
      onPreview(initialPricelistId).then(preview => {
        setPreviewData(preview);
        setStartRow(preview.start_row || 1);
        setStartColumn(preview.start_column || 1);
        setCurrent(1);
      }).catch(err => {
        message.error("Ошибка загрузки превью для этого прайса");
      });
    }
  }, [initialPricelistId, onPreview, message]);

  // Обновление превью при изменении стартовых параметров
  useEffect(() => {
    if (entityId && current === 1) { // Только на шаге настройки
      const timer = setTimeout(() => {
        onPreview(entityId, startRow, startColumn)
          .then(setPreviewData)
          .catch(() => message.error("Ошибка обновления превью"));
      }, 500); // Debounce
      return () => clearTimeout(timer);
    }
  }, [entityId, startRow, startColumn, current, onPreview, message]);

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
  }, [polling, entityId, onStatus, message]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const id = await onUpload(file);
      setEntityId(id);

      const preview = await onPreview(id, startRow, startColumn);
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
      await onParse(entityId, mapping, startRow, startColumn);
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
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>Настройка области парсинга</Title>
                <Space size="large" wrap>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Стартовая строка</Text>
                    <InputNumber 
                      min={1} 
                      value={startRow} 
                      onChange={(val) => {
                        if (val) setStartRow(val);
                      }} 
                    />
                  </Space>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Стартовая колонка</Text>
                    <InputNumber 
                      min={1} 
                      value={startColumn} 
                      onChange={(val) => {
                        if (val) setStartColumn(val);
                      }} 
                    />
                  </Space>
                  <div style={{ marginLeft: 20 }}>
                    <Text type="secondary">Зеленая область в таблице — это данные, которые будут обработаны.</Text>
                  </div>
                </Space>
              </div>

              <div>
                <Title level={5} style={{ marginBottom: 4 }}>Превью данных</Title>
                <Text type="secondary">Первые {previewData.total_preview_rows} строк файла</Text>
                <div style={{ marginTop: 12 }}>
                  <PreviewTable 
                    data={previewData} 
                    startRow={startRow} 
                    startColumn={startColumn}
                  />
                </div>
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
            <div style={{ maxWidth: 400, margin: '32px auto', position: 'relative' }}>
              <Progress
                type="dashboard"
                percent={parseStatus.progress}
                strokeColor={{ '0%': '#6366f1', '100%': '#a855f7' }}
                strokeWidth={12}
                size={200}
                format={(percent) => (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 28, fontWeight: 'bold', color: '#1e293b' }}>{percent}%</span>
                    <span style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Выполнено</span>
                  </div>
                )}
              />
              <div style={{ marginTop: 24 }}>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  Обработано: <strong style={{ color: '#0f172a' }}>{parseStatus.processed_rows}</strong> из <strong style={{ color: '#0f172a' }}>{parseStatus.total_rows}</strong> строк
                </Text>
              </div>
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
