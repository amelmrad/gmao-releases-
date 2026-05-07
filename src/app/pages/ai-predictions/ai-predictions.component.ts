import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { AiService } from '../../core/services/ai.service';
import { AiPrediction } from '../../models/ai.model';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-ai-predictions',
  templateUrl: './ai-predictions.component.html',
  styleUrls: ['./ai-predictions.component.scss']
})
export class AiPredictionsComponent implements OnInit, AfterViewInit {
  @ViewChild('riskChart') riskChartRef!: ElementRef;

  private get chartTextColor(): string {
    if (typeof getComputedStyle === 'undefined') return '#374151';
    const v = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim();
    return v || '#374151';
  }

  predictions: AiPrediction[] = [];
  loading = false;
  selectedPrediction: AiPrediction | null = null;
  filterLevel = '';

  // Garder les valeurs en anglais pour la logique
  riskLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
  
  // Pour l'affichage dans le template
  riskLevelLabels: { [key: string]: string } = {
    'CRITICAL': 'CRITIQUE',
    'HIGH': 'ÉLEVÉ',
    'MEDIUM': 'MOYEN',
    'LOW': 'FAIBLE',
    'UNKNOWN': 'INCONNU'
  };

  constructor(private aiService: AiService) {}

  ngOnInit(): void {
    this.loadPredictions();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initChart(), 800);
  }

  loadPredictions(): void {
    this.loading = true;
    this.aiService.getAllPredictions().subscribe({
      next: (res) => {
        this.predictions = res.data || [];
        this.loading = false;
        setTimeout(() => this.initChart(), 300);
      },
      error: () => { this.loading = false; }
    });
  }

  initChart(): void {
    if (!this.riskChartRef || this.predictions.length === 0) return;

    const ctx = this.riskChartRef.nativeElement.getContext('2d');
    const top8 = this.predictions.slice(0, 8);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top8.map(p => p.machineName),
        datasets: [{
          label: 'Score de risque',
          data: top8.map(p => p.riskScore),
          backgroundColor: top8.map(p => {
            if (p.riskScore >= 75) return 'rgba(231,76,60,0.8)';
            if (p.riskScore >= 50) return 'rgba(245,158,11,0.8)';
            if (p.riskScore >= 25) return 'rgba(202, 37, 182,0.8)';
            return 'rgba(164, 196, 148,0.8)';
          }),
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Score de risque: ${ctx.raw}/100`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: this.chartTextColor },
            max: 100
          },
          y: {
            grid: { display: false },
            ticks: { color: this.chartTextColor, font: { size: 11 } }
          }
        }
      }
    });
  }

  get filteredPredictions(): AiPrediction[] {
    if (!this.filterLevel) return this.predictions;
    return this.predictions.filter(p => p.riskLevel === this.filterLevel);
  }

  get criticalCount(): number {
    return this.predictions.filter(p => p.riskLevel === 'CRITICAL').length;
  }

  get highCount(): number {
    return this.predictions.filter(p => p.riskLevel === 'HIGH').length;
  }

  // Méthode utilitaire pour obtenir le libellé affichable
  getRiskLabel(level: string): string {
    return this.riskLevelLabels[level] || level;
  }

  getRiskClass(level: string): string {
    return level?.toLowerCase() || '';
  }

  getRiskBarWidth(score: number): number {
    return Math.min(score, 100);
  }

  getRiskBarColor(score: number): string {
    if (score >= 75) return '#e74c3c';
    if (score >= 50) return '#f59e0b';
    if (score >= 25) return '#ca25b6';
    return '#a4c494';
  }

  selectPrediction(pred: AiPrediction): void {
    this.selectedPrediction = this.selectedPrediction?.machineId === pred.machineId ? null : pred;
  }
}