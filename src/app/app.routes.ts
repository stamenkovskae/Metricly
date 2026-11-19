import { Routes } from '@angular/router';

// Every page is lazy-loaded so Chart.js stays out of the initial bundle.
export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'dashboards',
    loadComponent: () =>
      import('./components/dashboards/dashboards.component').then((m) => m.DashboardsComponent),
  },
  {
    path: 'builder',
    title: 'New chart',
    loadComponent: () =>
      import('./components/builder/builder.component').then((m) => m.BuilderComponent),
  },
];
