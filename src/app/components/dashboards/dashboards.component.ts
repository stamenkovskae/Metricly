import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardStore } from '../../dashboards/dashboard-store';
import { SavedChartComponent } from './saved-chart.component';

@Component({
  imports: [RouterLink, SavedChartComponent],
  selector: 'app-dashboards',
  styleUrl: './dashboards.component.css',
  templateUrl: './dashboards.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardsComponent {
  protected readonly store = inject(DashboardStore);

  protected removeDashboard(id: string, name: string): void {
    if (confirm(`Delete the dashboard "${name}" and all its charts?`)) this.store.deleteDashboard(id);
  }
}
