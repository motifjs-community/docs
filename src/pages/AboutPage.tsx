import { t } from '../i18n';

export default function AboutPage() {
    return (
        <div>
            <h1>{() => t('about.title')}</h1>
            <p>{() => t('about.description')}</p>
        </div>
    );
}