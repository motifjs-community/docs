import { Application } from '@motifx/core';
import { routes } from './routes';
import './styles/tokens.css';
import './style.css';
const builder = Application.CreateBuilder();
const app = builder.build();

app.useRouter({ routes, mode: 'history', scrollMemory:true });

// Route pages render after their chunk loads, so the browser cannot find a `#section` from the
// address on its own (e.g. "/#why-motifjs" opened from a docs page). Scroll once it exists.
app.onRouterChanged(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;

    let attempts = 0;
    const scrollToSection = () => {
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
        else if (++attempts < 60) requestAnimationFrame(scrollToSection);
    };
    requestAnimationFrame(scrollToSection);
});

app.run('#app');
