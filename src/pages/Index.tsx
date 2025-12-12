import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { usePulseDetection } from '@/hooks/usePulseDetection';

interface Measurement {
  id: string;
  date: string;
  restingHR: number;
  standingHR: number;
  difference: number;
  recommendation: string;
  status: 'excellent' | 'good' | 'attention' | 'warning';
}

const Index = () => {
  const [measurementType, setMeasurementType] = useState<'resting' | 'standing'>('resting');
  const [restingHR, setRestingHR] = useState<number | null>(null);
  const [completedHR, setCompletedHR] = useState<number | null>(null);
  
  const pulseDetection = usePulseDetection(10);
  const [measurements, setMeasurements] = useState<Measurement[]>([
    {
      id: '1',
      date: '2025-12-09',
      restingHR: 68,
      standingHR: 88,
      difference: 20,
      recommendation: 'Отличная адаптация сердечно-сосудистой системы',
      status: 'excellent'
    },
    {
      id: '2',
      date: '2025-12-08',
      restingHR: 72,
      standingHR: 96,
      difference: 24,
      recommendation: 'Хорошая адаптация, продолжайте регулярные тренировки',
      status: 'good'
    },
    {
      id: '3',
      date: '2025-12-07',
      restingHR: 70,
      standingHR: 102,
      difference: 32,
      recommendation: 'Умеренная адаптация. Рекомендуется увеличить физическую активность',
      status: 'attention'
    }
  ]);

  const getRecommendation = (diff: number): { text: string; status: 'excellent' | 'good' | 'attention' | 'warning' } => {
    if (diff < 12) {
      return {
        text: 'Отличная адаптация сердечно-сосудистой системы. Высокий уровень физической подготовки',
        status: 'excellent'
      };
    } else if (diff < 18) {
      return {
        text: 'Хорошая адаптация сердечно-сосудистой системы. Продолжайте регулярные тренировки',
        status: 'good'
      };
    } else if (diff < 25) {
      return {
        text: 'Умеренная адаптация. Рекомендуется увеличить аэробную физическую активность',
        status: 'attention'
      };
    } else {
      return {
        text: 'Низкая адаптация. Требуется консультация кардиолога и постепенное увеличение активности',
        status: 'warning'
      };
    }
  };

  const startMeasurement = async () => {
    setCompletedHR(null);
    await pulseDetection.startDetection();
  };

  useEffect(() => {
    if (pulseDetection.finalBPM && !pulseDetection.isDetecting) {
      const finalHR = pulseDetection.finalBPM;
      setCompletedHR(finalHR);

      if (measurementType === 'resting') {
        setRestingHR(finalHR);
        toast.success('Измерение пульса в покое завершено!');
      } else if (restingHR) {
        const diff = finalHR - restingHR;
        const rec = getRecommendation(diff);
        
        const newMeasurement: Measurement = {
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          restingHR: restingHR,
          standingHR: finalHR,
          difference: diff,
          recommendation: rec.text,
          status: rec.status
        };
        
        setMeasurements(prev => [newMeasurement, ...prev]);
        toast.success('Измерение завершено! Результат добавлен в историю.');
      }
    }
  }, [pulseDetection.finalBPM, pulseDetection.isDetecting, measurementType, restingHR]);

  useEffect(() => {
    if (pulseDetection.error) {
      toast.error(pulseDetection.error);
    }
  }, [pulseDetection.error]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-500 text-white';
      case 'good':
        return 'bg-blue-500 text-white';
      case 'attention':
        return 'bg-yellow-500 text-white';
      case 'warning':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'Отлично';
      case 'good':
        return 'Хорошо';
      case 'attention':
        return 'Внимание';
      case 'warning':
        return 'Требуется консультация';
      default:
        return '';
    }
  };

  const avgResting = Math.round(measurements.reduce((acc, m) => acc + m.restingHR, 0) / measurements.length);
  const avgStanding = Math.round(measurements.reduce((acc, m) => acc + m.standingHR, 0) / measurements.length);
  const avgDiff = Math.round(measurements.reduce((acc, m) => acc + m.difference, 0) / measurements.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6 py-6">
        <div className="text-center space-y-2 fade-in">
          <div className="flex items-center justify-center gap-3">
            <Icon name="Heart" size={40} className="text-primary" />
            <h1 className="text-4xl font-bold text-primary">PulseCheck</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Профессиональный мониторинг здоровья сердца
          </p>
        </div>

        <Tabs defaultValue="measure" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="measure" className="flex items-center gap-2">
              <Icon name="Camera" size={18} />
              Измерение
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Icon name="History" size={18} />
              История
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Icon name="TrendingUp" size={18} />
              Аналитика
            </TabsTrigger>
          </TabsList>

          <TabsContent value="measure" className="space-y-6">
            <Card className="fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Activity" size={24} className="text-primary" />
                  Измерение пульса
                </CardTitle>
                <CardDescription>
                  Приложите палец к камере и оставайтесь неподвижными
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center gap-4">
                  <Button
                    variant={measurementType === 'resting' ? 'default' : 'outline'}
                    onClick={() => setMeasurementType('resting')}
                    disabled={pulseDetection.isDetecting}
                    className="flex items-center gap-2"
                  >
                    <Icon name="Bed" size={20} />
                    В покое
                  </Button>
                  <Button
                    variant={measurementType === 'standing' ? 'default' : 'outline'}
                    onClick={() => setMeasurementType('standing')}
                    disabled={pulseDetection.isDetecting || !restingHR}
                    className="flex items-center gap-2"
                  >
                    <Icon name="User" size={20} />
                    Стоя
                  </Button>
                </div>

                {!restingHR && measurementType === 'standing' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <Icon name="AlertCircle" size={24} className="mx-auto mb-2 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      Сначала измерьте пульс в покое
                    </p>
                  </div>
                )}

                {pulseDetection.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <Icon name="AlertCircle" size={24} className="mx-auto mb-2 text-red-600" />
                    <p className="text-sm text-red-800 text-center mb-3">{pulseDetection.error}</p>
                    {pulseDetection.error.includes('разрешен') && (
                      <div className="text-xs text-red-700 space-y-1">
                        <p className="font-semibold">Как разрешить доступ:</p>
                        <p>1. Нажмите на иконку замка/камеры в адресной строке</p>
                        <p>2. Выберите "Разрешить" для камеры</p>
                        <p>3. Обновите страницу</p>
                      </div>
                    )}
                    {pulseDetection.error.includes('HTTPS') && (
                      <div className="text-xs text-red-700 text-center">
                        <p>Откройте сайт через опубликованную ссылку (HTTPS)</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="relative">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center overflow-hidden relative">
                    <video
                      ref={pulseDetection.videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      playsInline
                      muted
                      style={{ display: pulseDetection.isDetecting ? 'block' : 'none' }}
                    />
                    <canvas
                      ref={pulseDetection.canvasRef}
                      className="hidden"
                    />
                    {pulseDetection.isDetecting && (
                      <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg">
                        <Icon name="Video" size={20} className="inline mr-2" />
                        <span className="text-sm font-medium">Приложите палец к камере</span>
                      </div>
                    )}
                    {!pulseDetection.isDetecting && (
                      <div className="text-center space-y-2">
                        <Icon name="Camera" size={80} className="text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">Камера готова к измерению</p>
                      </div>
                    )}
                  </div>
                </div>

                {pulseDetection.isDetecting && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-6xl font-bold text-primary mb-2 pulse-animation">
                        {pulseDetection.currentBPM || '--'}
                      </div>
                      <p className="text-muted-foreground">уд/мин</p>
                    </div>
                    <Progress value={pulseDetection.progress} className="h-2" />
                    <p className="text-center text-sm text-muted-foreground">
                      Измерение... {Math.round(pulseDetection.progress)}%
                    </p>
                  </div>
                )}

                {!pulseDetection.isDetecting && completedHR && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <Icon name="CheckCircle2" size={48} className="text-green-600 mx-auto mb-3" />
                    <div className="text-4xl font-bold text-green-700 mb-2">{completedHR}</div>
                    <p className="text-green-700 font-medium">уд/мин</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {measurementType === 'resting' ? 'Пульс в покое' : 'Пульс стоя'}
                    </p>
                  </div>
                )}

                <Button
                  onClick={startMeasurement}
                  disabled={pulseDetection.isDetecting || (measurementType === 'standing' && !restingHR)}
                  className="w-full h-14 text-lg"
                  size="lg"
                >
                  {pulseDetection.isDetecting ? (
                    <>
                      <Icon name="Loader2" size={24} className="mr-2 animate-spin" />
                      Измерение...
                    </>
                  ) : (
                    <>
                      <Icon name="Play" size={24} className="mr-2" />
                      Начать измерение
                    </>
                  )}
                </Button>

                {restingHR && measurementType === 'resting' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 text-center">
                      <Icon name="Info" size={16} className="inline mr-2" />
                      Измерение в покое завершено. Теперь измерьте пульс стоя.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="ClipboardList" size={24} className="text-primary" />
                  История измерений
                </CardTitle>
                <CardDescription>
                  Все ваши измерения пульса с рекомендациями
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-sm">Дата</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm">В покое</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm">Стоя</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm">Разница</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm">Статус</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Рекомендация</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measurements.map((m) => (
                        <tr key={m.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-4 px-4 text-sm">
                            {new Date(m.date).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="text-center py-4 px-4">
                            <div className="font-bold text-lg">{m.restingHR}</div>
                            <div className="text-xs text-muted-foreground">уд/мин</div>
                          </td>
                          <td className="text-center py-4 px-4">
                            <div className="font-bold text-lg">{m.standingHR}</div>
                            <div className="text-xs text-muted-foreground">уд/мин</div>
                          </td>
                          <td className="text-center py-4 px-4">
                            <Badge variant="outline" className="font-bold">
                              +{m.difference}
                            </Badge>
                          </td>
                          <td className="text-center py-4 px-4">
                            <Badge className={getStatusColor(m.status)}>
                              {getStatusText(m.status)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm">{m.recommendation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon name="Heart" size={18} className="text-blue-600" />
                    Средний пульс в покое
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600">{avgResting}</div>
                  <p className="text-sm text-muted-foreground mt-1">уд/мин</p>
                </CardContent>
              </Card>

              <Card className="fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon name="Activity" size={18} className="text-green-600" />
                    Средний пульс стоя
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600">{avgStanding}</div>
                  <p className="text-sm text-muted-foreground mt-1">уд/мин</p>
                </CardContent>
              </Card>

              <Card className="fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon name="TrendingUp" size={18} className="text-orange-600" />
                    Средняя разница
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-orange-600">{avgDiff}</div>
                  <p className="text-sm text-muted-foreground mt-1">уд/мин</p>
                </CardContent>
              </Card>
            </div>

            <Card className="fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="BarChart3" size={24} className="text-primary" />
                  Динамика показателей
                </CardTitle>
                <CardDescription>
                  График изменения пульса за последние измерения
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {measurements.slice(0, 5).reverse().map((m, index) => (
                    <div key={m.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {new Date(m.date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                        <span className="text-muted-foreground">
                          {m.restingHR} → {m.standingHR} (+{m.difference})
                        </span>
                      </div>
                      <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute h-full bg-primary transition-all"
                          style={{ width: `${(m.restingHR / 120) * 100}%` }}
                        />
                        <div
                          className="absolute h-full bg-secondary transition-all opacity-70"
                          style={{ width: `${(m.standingHR / 120) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-6 mt-8 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary rounded" />
                    <span className="text-sm">В покое</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-secondary rounded" />
                    <span className="text-sm">Стоя</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fade-in bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Lightbulb" size={24} className="text-primary" />
                  Общие рекомендации
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Icon name="CheckCircle2" size={20} className="text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">Регулярный мониторинг</p>
                    <p className="text-sm text-muted-foreground">
                      Измеряйте пульс в одно и то же время суток для точной динамики
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Icon name="CheckCircle2" size={20} className="text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">Физическая активность</p>
                    <p className="text-sm text-muted-foreground">
                      150+ минут умеренной активности в неделю улучшают адаптацию
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Icon name="CheckCircle2" size={20} className="text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">Консультация специалиста</p>
                    <p className="text-sm text-muted-foreground">
                      При разнице более 30 уд/мин обратитесь к кардиологу
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;