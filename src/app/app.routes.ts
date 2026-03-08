import {Routes} from '@angular/router';
import { BuilderComponent } from './builder/builder.component';

export const routes: Routes = [
  { path: '', redirectTo: 'builder', pathMatch: 'full' },
  { path: 'builder', component: BuilderComponent }
];
