import { codeExamples, mountExamples, type CodeVariants } from './code-examples';

export type DocsLocale = 'en' | 'tr';

export interface DocCode {
    file: string;
    /** A fixed snippet, or variants that follow the site-wide code preference. */
    source: string | CodeVariants;
}

export interface DocSection {
    id: string;
    title: Record<DocsLocale, string>;
    paragraphs: Record<DocsLocale, string[]>;
    code?: DocCode;
}

export interface DocPage {
    slug: string;
    title: Record<DocsLocale, string>;
    description: Record<DocsLocale, string>;
    sections: DocSection[];
}

export interface DocCategory {
    id: string;
    title: Record<DocsLocale, string>;
    description: Record<DocsLocale, string>;
    pages: DocPage[];
}

const quickstartSections: DocSection[] = [
    {
        id: 'requirements',
        title: { en: 'Requirements', tr: 'Gereksinimler' },
        paragraphs: {
            en: ['Use Vite or Rollup with the MotifJS runtime and JSX compiler. Keep both MotifJS packages on the same major version.'],
            tr: ['MotifJS runtime ve JSX compiler ile Vite veya Rollup kullanın. İki MotifJS paketini aynı major sürümde tutun.']
        }
    },
    {
        id: 'build-setup',
        title: { en: 'Build setup', tr: 'Build yapılandırması' },
        paragraphs: {
            en: ['The MotifJS compiler processes JSX during the build. Configure Vite to preserve JSX so the compiler can transform it.'],
            tr: ['MotifJS compiler JSX’i build sırasında işler. Compiler’ın dönüştürebilmesi için Vite’ta JSX dönüşümünü koruyun.']
        },
        code: {
            file: 'vite.config.ts',
            source: `import { defineConfig } from 'vite';
import compiler from '@motifx/compiler';

export default defineConfig({
  plugins: [compiler()],
  esbuild: { jsx: 'preserve' },
});`
        }
    },
    {
        id: 'first-component',
        title: { en: 'Create a component', tr: 'Bir component oluşturun' },
        paragraphs: {
            en: ['A component can own reactive state and return a view. The example follows your code preference; Class, Function, and Options forms use the same runtime.'],
            tr: ['Bir component reaktif state tutabilir ve görünüm döndürebilir. Örnek, seçtiğiniz kod tercihini izler; Class, Function ve Options biçimleri aynı runtime’ı kullanır.']
        },
        code: { file: 'counter.tsx', source: codeExamples }
    },
    {
        id: 'mount-app',
        title: { en: 'Mount the application', tr: 'Uygulamayı bağlayın' },
        paragraphs: {
            en: ['Build an Application and mount the root component into an element in the document. A Class component is passed as an instance; Function and Options components are passed as a JSX tag. Add a router when the application has multiple views.'],
            tr: ['Bir Application oluşturup kök component’i belgedeki bir elemente bağlayın. Class component örnek (instance) olarak, Function ve Options component’leri JSX etiketi olarak verilir. Uygulama birden fazla görünüm içeriyorsa router ekleyin.']
        },
        code: { file: 'main.tsx', source: mountExamples }
    }
];

function page(
    slug: string,
    title: string,
    titleTr: string,
    description: string,
    descriptionTr: string,
    section: string,
    sectionTr: string,
    body: string,
    bodyTr: string
): DocPage {
    return {
        slug,
        title: { en: title, tr: titleTr },
        description: { en: description, tr: descriptionTr },
        sections: [{
            id: section,
            title: { en: section, tr: sectionTr },
            paragraphs: { en: [body], tr: [bodyTr] }
        }]
    };
}

export const docsCategories: DocCategory[] = [
    {
        id: 'start',
        title: { en: 'Get started', tr: 'Başlangıç' },
        description: { en: 'Install MotifJS and create the first application pieces.', tr: 'MotifJS’i kurun ve uygulamanın ilk parçalarını oluşturun.' },
        pages: [
            {
                slug: 'getting-started',
                title: { en: 'Getting started', tr: 'Başlarken' },
                description: { en: 'Set up the build, create a component, and mount an application.', tr: 'Build yapılandırmasını yapın, component oluşturun ve uygulamayı bağlayın.' },
                sections: quickstartSections
            },
            page('components', 'Components', 'Bileşenler', 'Class, Function, and Options components share one component model.', 'Class, Function ve Options bileşenleri aynı component modelini kullanır.', 'Three component forms', 'Üç component biçimi', 'Choose a class, function, or Options object. Each form participates in the same component lifecycle and can manage child controls.', 'Class, Function veya Options nesnesi seçin. Her biçim aynı component lifecycle’ına katılır ve alt kontrolleri yönetebilir.'),
            page('jsx-templates', 'JSX and templates', 'JSX ve şablonlar', 'Build component views with JSX and compiler-managed bindings.', 'JSX ve compiler tarafından yönetilen binding’lerle component görünümü oluşturun.', 'JSX in a component', 'Component içinde JSX', 'The compiler turns JSX expressions into bindings, event handlers, and child controls. Preserve JSX in the TypeScript or Vite configuration.', 'Compiler JSX ifadelerini binding, event handler ve alt kontrollere dönüştürür. TypeScript veya Vite yapılandırmasında JSX dönüşümünü koruyun.')
        ]
    },
    {
        id: 'ui-state',
        title: { en: 'UI and state', tr: 'Arayüz ve state' },
        description: { en: 'Connect state to views, events, and forms.', tr: 'State’i görünümlere, olaylara ve formlara bağlayın.' },
        pages: [
            page('reactivity', 'Reactivity', 'Reaktivite', 'Manage application state with reactive objects, signals, and effects.', 'Reaktif nesneler, signal ve effect’lerle uygulama state’ini yönetin.', 'Reactive state', 'Reaktif state', 'Reads are tracked and writes notify the bindings and effects that depend on them. Use reactive objects for structured state and signals for a single value.', 'Okumalar izlenir; yazmalar ilgili binding ve effect’leri tetikler. Yapılandırılmış state için reactive nesneleri, tek değer için signal kullanın.'),
            page('conditionals-lists', 'Conditionals and lists', 'Koşullar ve listeler', 'Show, hide, switch, and render collections of components.', 'Component’leri gösterin, gizleyin, koşullu seçin ve koleksiyonları listeleyin.', 'Choose a rendering pattern', 'Gösterim yöntemini seçin', 'Use x-wait when hidden content should preserve its instance. Use conditional branches when creating and disposing content is intentional. Lists are rendered from arrays with stable item keys.', 'Gizli içeriğin örneği korunacaksa x-wait kullanın. İçeriğin oluşturulup dispose edilmesi isteniyorsa koşullu dal kullanın. Listeler dizilerden kararlı öğe anahtarlarıyla oluşturulur.'),
            page('events', 'Events', 'Olaylar', 'Handle DOM, component, and application events.', 'DOM, component ve application olaylarını yönetin.', 'Event handlers', 'Event handler’lar', 'Attach DOM handlers in JSX or use the component event API for imperative subscriptions. Component-owned listeners are removed when their owner is disposed.', 'DOM handler’larını JSX’te tanımlayın veya imperative abonelik için component event API’sini kullanın. Component’e ait listener’lar sahibi dispose edildiğinde kaldırılır.'),
            page('forms', 'Forms and model binding', 'Formlar ve model binding', 'Bind input values and checked state to application data.', 'Input değerlerini ve checked durumunu uygulama verisine bağlayın.', 'Bind form state', 'Form state’ini bağlayın', 'Use bindings.model or x-model for two-way binding. For explicit control, bind the value and update state from the input event.', 'İki yönlü bağlama için bindings.model veya x-model kullanın. Açık kontrol gerektiğinde value’yu bağlayıp input olayında state’i güncelleyin.')
        ]
    },
    {
        id: 'application',
        title: { en: 'Application structure', tr: 'Uygulama yapısı' },
        description: { en: 'Organize navigation, lifecycles, services, and resources.', tr: 'Gezinme, lifecycle, servis ve kaynakları düzenleyin.' },
        pages: [
            page('lifecycle', 'Component lifecycle', 'Component yaşam döngüsü', 'Run setup, mount, activation, and disposal work at the right time.', 'Kurulum, mount, activation ve disposal işlerini doğru zamanda çalıştırın.', 'Lifecycle hooks', 'Lifecycle kancaları', 'Use initializeComponent for component setup, onMounted for work requiring a live DOM node, and disposal hooks or registered disposables for cleanup.', 'Component kurulumu için initializeComponent, canlı DOM gerektiren işler için onMounted kullanın. Temizliği disposal kancalarına veya kayıtlı disposable’lara bırakın.'),
            page('routing', 'Routing', 'Routing', 'Define nested routes, layouts, parameters, and navigation.', 'İç içe route’lar, layout’lar, parametreler ve gezinme tanımlayın.', 'Route layouts', 'Route layout’ları', 'A layout route can host child routes through RouterView. Use route parameters for page-specific data and RouterLink or router navigation for transitions.', 'Bir layout route, RouterView üzerinden alt route’ları barındırabilir. Sayfaya özel veri için route parametrelerini; geçiş için RouterLink veya router navigation kullanın.'),
            page('dependency-injection', 'Dependency injection', 'Dependency injection', 'Register and resolve application services with defined lifetimes.', 'Uygulama servislerini belirlenmiş yaşam süreleriyle kaydedip çözümleyin.', 'Service lifetimes', 'Servis yaşam süreleri', 'Register singleton, scoped, or transient services with the application builder. Resolve services from a component or inject them into supported constructors.', 'Application builder ile singleton, scoped veya transient servis kaydedin. Servisleri component’ten çözümleyin ya da desteklenen yapıcılara inject edin.'),
            page('styling-animation', 'Styling and transitions', 'Stil ve animasyon', 'Apply classes, styles, and lifecycle-aware transitions.', 'Class, stil ve lifecycle uyumlu geçişler uygulayın.', 'Style and transition', 'Stil ve transition', 'Use JSX class and style bindings for view state. Configure transitions for components that enter, leave, or change visibility.', 'Görünüm state’i için JSX class ve style binding’lerini kullanın. Görünürlük değiştiren veya eklenip kaldırılan component’ler için transition tanımlayın.'),
            page('virtualization', 'Virtualization', 'Virtualization', 'Render large collections within a visible viewport.', 'Büyük koleksiyonları görünür viewport içinde oluşturun.', 'Render visible rows', 'Görünür satırları oluşturun', 'Virtualization keeps large lists manageable by rendering a moving window of rows and requesting data as needed.', 'Virtualization, satırların hareketli bir penceresini oluşturarak ve gerektiğinde veri isteyerek büyük listelerin yönetimini sağlar.'),
            page('memory-disposal', 'Memory and disposal', 'Bellek ve dispose', 'Tie subscriptions, effects, and external resources to component ownership.', 'Abonelikleri, effect’leri ve harici kaynakları component sahipliğine bağlayın.', 'Dispose owned resources', 'Sahip olunan kaynakları dispose edin', 'MotifJS disposes child controls and bindings with their component. Register timers, observers, and external subscriptions so they are also released.', 'MotifJS alt kontrolleri ve binding’leri component ile birlikte dispose eder. Timer, observer ve harici abonelikleri de temizlenmeleri için kaydedin.')
        ]
    },
    {
        id: 'reference',
        title: { en: 'Reference and integrations', tr: 'Referans ve entegrasyonlar' },
        description: { en: 'Look up APIs and connect existing libraries.', tr: 'API’lere bakın ve mevcut kütüphaneleri bağlayın.' },
        pages: [
            page('api-reference', 'API reference', 'API referansı', 'Browse the public Application, Component, reactivity, and binding APIs.', 'Application, Component, reaktivite ve binding API’lerini inceleyin.', 'Public API', 'Public API', 'The API reference groups the public exports by application setup, components, reactivity, bindings, dependency injection, routing, and disposal.', 'API referansı dışa aktarılan öğeleri application kurulumu, component, reaktivite, binding, dependency injection, routing ve disposal başlıklarında toplar.'),
            page('third-party-libraries', 'Third-party libraries', 'Üçüncü parti kütüphaneler', 'Wrap libraries that manage their own DOM and lifecycle.', 'Kendi DOM’unu ve lifecycle’ını yöneten kütüphaneleri sarın.', 'Own setup and cleanup', 'Kurulum ve temizliği yönetin', 'Initialize DOM-owning libraries after the component mounts, and register their teardown with the component. Avoid having two systems mutate the same subtree.', 'DOM sahipliği olan kütüphaneleri component mount edildikten sonra başlatın, kapatma işlemini component’e kaydedin. Aynı alt ağacı iki sistemin değiştirmesinden kaçının.'),
            page('queries', 'Collection queries', 'Koleksiyon sorguları', 'Filter, sort, group, and aggregate data with Query.', 'Query ile verileri filtreleyin, sıralayın, gruplayın ve toplayın.', 'Compose query operations', 'Sorgu adımlarını birleştirin', 'Query provides chainable collection operations. Use it to express data transformations clearly, then bind the resulting values to your application view.', 'Query zincirlenebilir koleksiyon işlemleri sunar. Veri dönüşümlerini açıkça ifade edin ve sonuçları uygulama görünümüne bağlayın.')
        ]
    }
];

export const allDocPages = docsCategories.flatMap((category) => category.pages);
export const defaultDocSlug = 'getting-started';

/** The page for a slug; unknown slugs fall back to the getting-started guide. */
export function findDoc(slug: string | undefined): DocPage {
    return allDocPages.find((doc) => doc.slug === slug) ?? allDocPages.find((doc) => doc.slug === defaultDocSlug)!;
}

export function findCategory(slug: string | undefined): DocCategory {
    return docsCategories.find((category) => category.pages.some((doc) => doc.slug === slug)) ?? docsCategories[0];
}

export function adjacentDocs(slug: string | undefined): { previous: DocPage | null; next: DocPage | null } {
    const index = allDocPages.findIndex((doc) => doc.slug === slug);
    return {
        previous: index > 0 ? allDocPages[index - 1] : null,
        next: index >= 0 && index < allDocPages.length - 1 ? allDocPages[index + 1] : null
    };
}
