import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Resolve API URL dynamically based on the browser's current hostname.
// This ensures the app works from localhost, LAN IP, or cloud domain.
environment.apiUrl = `${window.location.protocol}//${window.location.hostname}:8080/api`;

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
