import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { ReportService } from '../../core/services/report.service';
import { TaskService } from '../../core/services/task.service';
import { AiService } from '../../core/services/ai.service';

import { DashboardStats, AiPrediction } from '../../models/ai.model';
import { Task } from '../../models/task.model';

import * as echarts from 'echarts';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('machineStatusChart') machineChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('taskStatusChart') taskChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('riskChart') riskChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('machineHealthChart') healthChartRef?: ElementRef<HTMLDivElement>;

  stats: DashboardStats | null = null;
  recentTasks: Task[] = [];
  allTasks: Task[] = [];
  criticalPredictions: AiPrediction[] = [];

  loading = true;
  refreshing = false;

  private machineChart?: echarts.ECharts;
  private taskChart?: echarts.ECharts;
  private riskChart?: echarts.ECharts;
  private healthChart?: echarts.ECharts;
  private resizeObserver?: ResizeObserver;
  private destroy$ = new Subject<void>();
  private resizeHandler = () => this.resizeAllCharts();

  private readonly STATS_CACHE_KEY = 'gmao_dashboard_stats';
  private readonly PREDICTIONS_CACHE_KEY = 'gmao_dashboard_predictions';
  private readonly TASKS_CACHE_KEY = 'gmao_dashboard_tasks';

  private get chartTextColor(): string {
    if (typeof getComputedStyle === 'undefined') return '#374151';
    const v = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim();
    return v || '#374151';
  }

  constructor(
    public authService: AuthService,
    private reportService: ReportService,
    private taskService: TaskService,
    private aiService: AiService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.restoreFromCache();
    this.loadData();
  }

  ngAfterViewInit(): void {
    window.addEventListener('resize', this.resizeHandler);
    this.scheduleChartRender();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', this.resizeHandler);
    this.machineChart?.dispose();
    this.taskChart?.dispose();
    this.riskChart?.dispose();
    this.healthChart?.dispose();
    this.resizeObserver?.disconnect();
  }

  private restoreFromCache(): void {
    try {
      const cachedStats = localStorage.getItem(this.STATS_CACHE_KEY);
      if (cachedStats) {
        this.stats = JSON.parse(cachedStats);
      }
      const cachedPredictions = localStorage.getItem(this.PREDICTIONS_CACHE_KEY);
      if (cachedPredictions) {
        this.criticalPredictions = JSON.parse(cachedPredictions);
      }
      const cachedTasks = localStorage.getItem(this.TASKS_CACHE_KEY);
      if (cachedTasks) {
        const tasks = JSON.parse(cachedTasks);
        this.allTasks = tasks;
        this.recentTasks = tasks.slice(0, 5);
      }
    } catch {
      // ignore cache errors
    }
  }

  get userName(): string {
    return this.authService.currentUser?.name || '';
  }

  get userRole(): string {
    return this.authService.currentUser?.role || '';
  }

  get isAdminOrResponsable(): boolean {
    const role = this.authService.currentUser?.role;
    return role === 'ADMIN' || role === 'RESPONSABLE';
  }

  get isTechnician(): boolean {
    return this.authService.currentUser?.role === 'TECHNICIAN';
  }

  get techAssignedTasks(): Task[] {
    return this.allTasks.filter(t => t.technicianId === this.authService.currentUser?.id);
  }
  get techPendingTasks(): number {
    return this.techAssignedTasks.filter(t => t.status === 'EN_ATTENTE').length;
  }
  get techInProgressTasks(): number {
    return this.techAssignedTasks.filter(t => t.status === 'IN_PROGRESS').length;
  }
  get techCompletedTasks(): number {
    return this.techAssignedTasks.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
  }
  get techCompletionRate(): number {
    const total = this.techAssignedTasks.length;
    if (total === 0) return 0;
    return Math.round((this.techCompletedTasks / total) * 100);
  }

  loadData(): void {
    const isRefresh = this.stats !== null || this.allTasks.length > 0;
    if (isRefresh) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }

    if (this.isAdminOrResponsable) {
      this.reportService.getDashboardStats().pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          this.stats = res?.data ?? this.stats;
          try { localStorage.setItem(this.STATS_CACHE_KEY, JSON.stringify(this.stats)); } catch {}
          this.loading = false;
          this.refreshing = false;
          this.scheduleChartRender();
        },
        error: () => {
          this.loading = false;
          this.refreshing = false;
          this.scheduleChartRender();
        }
      });
    } else {
      this.loading = false;
    }

    this.taskService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const tasks: Task[] = res?.data || [];
        this.allTasks = tasks;
        this.recentTasks = tasks.slice(0, 5);
        try { localStorage.setItem(this.TASKS_CACHE_KEY, JSON.stringify(tasks)); } catch {}
        if (this.isTechnician) {
          this.loading = false;
          this.refreshing = false;
        }
      },
      error: () => {
        if (this.isTechnician) {
          this.loading = false;
          this.refreshing = false;
        }
      }
    });

    if (this.isAdminOrResponsable) {
      this.aiService.getAllPredictions().pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          const predictions: AiPrediction[] = res?.data || [];
          this.criticalPredictions = predictions
            .filter(p => p.riskScore >= 50)
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 5);
          try { localStorage.setItem(this.PREDICTIONS_CACHE_KEY, JSON.stringify(this.criticalPredictions)); } catch {}
          this.scheduleChartRender();
        }
      });
    }
  }

  private scheduleChartRender(): void {
    // Wait for *ngIf to render the chart containers before reading ViewChild refs.
    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.renderAllCharts());
    });
  }

  private renderAllCharts(): void {
    this.renderMachineChart();
    this.renderTaskChart();
    this.renderHealthChart();
    this.renderRiskChart();
  }

  private resizeAllCharts(): void {
    this.machineChart?.resize();
    this.taskChart?.resize();
    this.riskChart?.resize();
    this.healthChart?.resize();
  }

  private getOrInit(
    ref: ElementRef<HTMLDivElement> | undefined,
    existing: echarts.ECharts | undefined
  ): echarts.ECharts | undefined {
    if (!ref?.nativeElement) return undefined;
    if (existing && !existing.isDisposed()) return existing;
    const chart = echarts.init(ref.nativeElement);
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.resizeAllCharts());
    }
    this.resizeObserver.observe(ref.nativeElement);
    return chart;
  }

  private renderMachineChart(): void {
    if (!this.stats) return;
    const chart = this.getOrInit(this.machineChartRef, this.machineChart);
    if (!chart) return;
    this.machineChart = chart;

    const colorMap: Record<string, string> = {
      'Opérationnel': '#a4c494',
      'En maintenance': '#f59e0b',
      'En panne': '#e74c3c',
      'Inactive': '#9e9e9e'
    };
    const data = [
      { name: 'Opérationnel', value: this.stats.operationalMachines, itemStyle: { color: colorMap['Opérationnel'] } },
      { name: 'En maintenance', value: this.stats.maintenanceMachines, itemStyle: { color: colorMap['En maintenance'] } },
      { name: 'En panne', value: this.stats.brokenMachines, itemStyle: { color: colorMap['En panne'] } },
      { name: 'Inactive', value: this.stats.idleMachines, itemStyle: { color: colorMap['Inactive'] } }
    ].filter(item => item.value > 0);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: this.chartTextColor } },
      series: [{
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '45%'],
        data,
        label: { show: true, formatter: '{b}\n{c}', color: this.chartTextColor, fontWeight: 'bold', fontSize: 11 },
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.2)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 2
        }
      }],
      animationDuration: 800,
      animationEasing: 'cubicOut'
    }, true);
    chart.resize();
  }

  private renderTaskChart(): void {
    if (!this.stats) return;
    const chart = this.getOrInit(this.taskChartRef, this.taskChart);
    if (!chart) return;
    this.taskChart = chart;

    const colors = ['#f59e0b', '#ca25b6', '#a4c494'];
    const categories = ['En attente', 'En cours', 'Terminées'];
    const values = [this.stats.pendingTasks, this.stats.inProgressTasks, this.stats.completedTasks];

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => `${categories[params[0].dataIndex]}: ${values[params[0].dataIndex]} tâches`
      },
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: this.chartTextColor },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: this.chartTextColor },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      series: [{
        type: 'bar',
        data: values,
        barWidth: '45%',
        itemStyle: {
          color: (params: any) => colors[params.dataIndex],
          borderRadius: [6, 6, 0, 0]
        },
        label: { show: true, position: 'top', color: this.chartTextColor, fontWeight: 'bold' }
      }],
      animationDuration: 800,
      animationEasing: 'cubicOut'
    }, true);
    chart.resize();
  }

  private renderHealthChart(): void {
    if (!this.stats) return;
    const chart = this.getOrInit(this.healthChartRef, this.healthChart);
    if (!chart) return;
    this.healthChart = chart;

    const rate = this.healthRate;
    const color = rate >= 70 ? '#a4c494' : rate >= 40 ? '#f59e0b' : '#e74c3c';

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { formatter: `Santé: ${rate}%` },
      series: [{
        type: 'gauge',
        radius: '90%',
        center: ['50%', '60%'],
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        progress: { show: true, width: 18, itemStyle: { color } },
        axisLine: { lineStyle: { width: 18, color: [[1, 'rgba(255,255,255,0.08)']] } },
        axisTick: { show: false },
        splitLine: { distance: -22, length: 8, lineStyle: { color: 'rgba(255,255,255,0.2)', width: 2 } },
        axisLabel: { distance: -32, color: this.chartTextColor, fontSize: 10 },
        pointer: { show: false },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          color,
          fontSize: 28,
          fontWeight: 'bold',
          offsetCenter: [0, '10%']
        },
        title: {
          offsetCenter: [0, '40%'],
          color: this.chartTextColor,
          fontSize: 12
        },
        data: [{ value: rate, name: 'Santé du parc' }]
      }],
      animationDuration: 800
    }, true);
    chart.resize();
  }

  private renderRiskChart(): void {
    if (!this.criticalPredictions || this.criticalPredictions.length === 0) {
      // dispose chart so the empty-state element shows
      if (this.riskChart && !this.riskChart.isDisposed()) {
        this.riskChart.dispose();
        this.riskChart = undefined;
      }
      return;
    }
    const chart = this.getOrInit(this.riskChartRef, this.riskChart);
    if (!chart) return;
    this.riskChart = chart;

    const data = this.criticalPredictions.map(p => ({ name: p.machineName, value: p.riskScore }));
    const colors = this.criticalPredictions.map(p =>
      p.riskScore >= 75 ? '#e74c3c' : p.riskScore >= 50 ? '#f59e0b' : '#a4c494'
    );

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}% risque',
        backgroundColor: 'rgba(0,0,0,0.7)',
        textStyle: { color: '#fff' }
      },
      series: [{
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['50%', '50%'],
        data,
        label: { show: true, formatter: '{b}\n{c}%', color: this.chartTextColor, fontSize: 11 },
        itemStyle: {
          color: (params: any) => colors[params.dataIndex],
          shadowBlur: 12,
          shadowColor: 'rgba(0,0,0,0.4)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 2
        }
      }],
      animationDuration: 800
    }, true);
    chart.resize();
  }

  get completionRate(): number {
    if (!this.stats || this.stats.totalTasks === 0) return 0;
    return Math.round((this.stats.completedTasks / this.stats.totalTasks) * 100);
  }

  get healthRate(): number {
    if (!this.stats || this.stats.totalMachines === 0) return 0;
    return Math.round((this.stats.operationalMachines / this.stats.totalMachines) * 100);
  }

  get hasMachineData(): boolean {
    return !!this.stats && this.stats.totalMachines > 0;
  }

  get hasTaskData(): boolean {
    return !!this.stats && this.stats.totalTasks > 0;
  }

  getPriorityClass(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'priority-critical';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-default';
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'Critique';
      case 'high': return 'Élevée';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return priority;
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'in_progress': return 'status-inprogress';
      case 'rejected': return 'status-rejected';
      default: return 'status-default';
    }
  }

  getStatusLabel(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'Approuvé';
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  }

  getAiRiskClass(riskScore: number): string {
    if (riskScore >= 75) return 'risk-critical';
    if (riskScore >= 50) return 'risk-high';
    return 'risk-low';
  }
}
