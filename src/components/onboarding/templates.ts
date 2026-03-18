export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  files: { path: string; content: string }[];
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'vanilla',
    name: 'Vanilla HTML/CSS/JS',
    description: 'Clean starter with CSS variables and responsive layout',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <nav>
      <h1>My Project</h1>
      <ul>
        <li><a href="#home">Home</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </header>
  <main>
    <section id="home" class="hero">
      <h2>Welcome</h2>
      <p>Start editing this page visually with HTML Wizard.</p>
      <button class="btn-primary">Get Started</button>
    </section>
    <section id="about">
      <h2>About</h2>
      <p>This is a starter template with CSS custom properties for theming.</p>
    </section>
  </main>
  <footer>
    <p>&copy; 2026 My Project</p>
  </footer>
  <script src="main.js"></script>
</body>
</html>`,
      },
      {
        path: 'styles.css',
        content: `:root {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-bg: #ffffff;
  --color-text: #1f2937;
  --color-muted: #6b7280;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --radius: 0.5rem;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: var(--font-sans); color: var(--color-text); background: var(--color-bg); }
header { padding: var(--spacing-md) var(--spacing-lg); border-bottom: 1px solid #e5e7eb; }
nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; }
nav ul { display: flex; gap: var(--spacing-md); list-style: none; }
nav a { color: var(--color-muted); text-decoration: none; }
nav a:hover { color: var(--color-primary); }
main { max-width: 1200px; margin: 0 auto; padding: var(--spacing-lg); }
.hero { text-align: center; padding: 4rem 0; }
.hero h2 { font-size: 2.5rem; margin-bottom: var(--spacing-md); }
.hero p { color: var(--color-muted); font-size: 1.125rem; margin-bottom: var(--spacing-lg); }
.btn-primary { background: var(--color-primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: var(--radius); font-size: 1rem; cursor: pointer; }
.btn-primary:hover { opacity: 0.9; }
section { padding: var(--spacing-lg) 0; }
footer { text-align: center; padding: var(--spacing-lg); color: var(--color-muted); border-top: 1px solid #e5e7eb; }

@media (max-width: 768px) {
  .hero h2 { font-size: 1.75rem; }
  nav { flex-direction: column; gap: var(--spacing-sm); }
}`,
      },
      {
        path: 'main.js',
        content: `// Your JavaScript here
console.log('Project loaded');`,
      },
    ],
  },
  {
    id: 'bootstrap5',
    name: 'Bootstrap 5',
    description: 'Bootstrap 5 via CDN with navbar, hero section, and grid cards',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Bootstrap Project</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Navbar -->
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container">
      <a class="navbar-brand fw-bold" href="#">My Project</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item"><a class="nav-link active" href="#home">Home</a></li>
          <li class="nav-item"><a class="nav-link" href="#features">Features</a></li>
          <li class="nav-item"><a class="nav-link" href="#contact">Contact</a></li>
        </ul>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section id="home" class="hero-section text-center py-5">
    <div class="container py-5">
      <h1 class="display-4 fw-bold mb-3">Welcome to My Project</h1>
      <p class="lead text-muted mb-4">Built with Bootstrap 5 and ready to be edited visually in HTML Wizard.</p>
      <a href="#features" class="btn btn-primary btn-lg me-2">Get Started</a>
      <a href="#contact" class="btn btn-outline-secondary btn-lg">Learn More</a>
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="py-5 bg-light">
    <div class="container">
      <h2 class="text-center mb-5">Features</h2>
      <div class="row g-4">
        <div class="col-md-4">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body text-center p-4">
              <div class="feature-icon mb-3">&#9654;</div>
              <h5 class="card-title">Fast</h5>
              <p class="card-text text-muted">Optimised for speed and performance out of the box.</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body text-center p-4">
              <div class="feature-icon mb-3">&#9679;</div>
              <h5 class="card-title">Responsive</h5>
              <p class="card-text text-muted">Looks great on every device with Bootstrap's grid system.</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body text-center p-4">
              <div class="feature-icon mb-3">&#9670;</div>
              <h5 class="card-title">Customisable</h5>
              <p class="card-text text-muted">Easily override Bootstrap variables to match your brand.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Contact -->
  <section id="contact" class="py-5">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <h2 class="text-center mb-4">Contact Us</h2>
          <form>
            <div class="mb-3">
              <label for="name" class="form-label">Name</label>
              <input type="text" class="form-control" id="name" placeholder="Your name">
            </div>
            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input type="email" class="form-control" id="email" placeholder="you@example.com">
            </div>
            <div class="mb-3">
              <label for="message" class="form-label">Message</label>
              <textarea class="form-control" id="message" rows="4" placeholder="Your message"></textarea>
            </div>
            <div class="d-grid">
              <button type="submit" class="btn btn-primary">Send Message</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-dark text-white py-4 text-center">
    <div class="container">
      <p class="mb-0">&copy; 2026 My Project. All rights reserved.</p>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc4s9bIOgUxi8T/jzmTbdRMNkqn6LRZ6Xen5sSbsNmw" crossorigin="anonymous"></script>
  <script src="main.js"></script>
</body>
</html>`,
      },
      {
        path: 'styles.css',
        content: `/* Custom overrides for Bootstrap 5 template */

:root {
  --bs-primary: #3b82f6;
  --bs-primary-rgb: 59, 130, 246;
}

.hero-section {
  background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%);
  color: #fff;
  min-height: 50vh;
  display: flex;
  align-items: center;
}

.hero-section .text-muted {
  color: rgba(255, 255, 255, 0.75) !important;
}

.feature-icon {
  font-size: 2rem;
  color: #3b82f6;
}

.card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
}`,
      },
      {
        path: 'main.js',
        content: `// Your custom JavaScript here
console.log('Bootstrap project loaded');`,
      },
    ],
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    description: 'Tailwind CSS via CDN with utility-first responsive layout',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Tailwind Project</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              50:  '#eff6ff',
              100: '#dbeafe',
              500: '#3b82f6',
              600: '#2563eb',
              700: '#1d4ed8',
            }
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" href="styles.css">
</head>
<body class="bg-white text-gray-900 font-sans antialiased">

  <!-- Navbar -->
  <header class="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <a href="#" class="text-xl font-bold text-brand-600">My Project</a>
        <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <a href="#home" class="hover:text-brand-600 transition-colors">Home</a>
          <a href="#features" class="hover:text-brand-600 transition-colors">Features</a>
          <a href="#contact" class="hover:text-brand-600 transition-colors">Contact</a>
        </nav>
        <a href="#contact" class="hidden md:inline-flex items-center px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
          Get in Touch
        </a>
      </div>
    </div>
  </header>

  <!-- Hero -->
  <section id="home" class="pt-32 pb-24 bg-gradient-to-br from-brand-50 to-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <span class="inline-block px-3 py-1 mb-6 text-xs font-semibold text-brand-600 bg-brand-100 rounded-full uppercase tracking-wider">
        HTML Wizard Starter
      </span>
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
        Build something<br class="hidden sm:block"> <span class="text-brand-600">remarkable</span>
      </h1>
      <p class="max-w-2xl mx-auto text-lg text-gray-500 mb-10">
        A Tailwind CSS starter template ready for visual editing. Modify any element directly or let AI suggest improvements.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="#features" class="px-8 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30">
          Explore Features
        </a>
        <a href="#contact" class="px-8 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          Get Started
        </a>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="py-24 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-gray-900">Everything you need</h2>
        <p class="mt-4 text-gray-500 max-w-xl mx-auto">A solid foundation with modern utilities and a design system ready to customise.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- Card 1 -->
        <div class="group p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all">
          <div class="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-4 group-hover:bg-brand-600 transition-colors">
            <svg class="w-6 h-6 text-brand-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h3>
          <p class="text-gray-500 text-sm leading-relaxed">Tailwind's JIT compiler keeps your CSS lean and your builds instant.</p>
        </div>
        <!-- Card 2 -->
        <div class="group p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all">
          <div class="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-4 group-hover:bg-brand-600 transition-colors">
            <svg class="w-6 h-6 text-brand-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Responsive Grid</h3>
          <p class="text-gray-500 text-sm leading-relaxed">Mobile-first breakpoints and a flexible grid right out of the box.</p>
        </div>
        <!-- Card 3 -->
        <div class="group p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all">
          <div class="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-4 group-hover:bg-brand-600 transition-colors">
            <svg class="w-6 h-6 text-brand-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Themeable</h3>
          <p class="text-gray-500 text-sm leading-relaxed">Extend the design token system to match any brand in seconds.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Contact -->
  <section id="contact" class="py-24 bg-gray-50">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-bold text-gray-900">Get in touch</h2>
        <p class="mt-3 text-gray-500">We'd love to hear from you. Fill out the form below.</p>
      </div>
      <form class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" id="name" placeholder="Your name" class="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition">
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" id="email" placeholder="you@example.com" class="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition">
        </div>
        <div>
          <label for="message" class="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea id="message" rows="4" placeholder="Your message..." class="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-none"></textarea>
        </div>
        <button type="submit" class="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20">
          Send Message
        </button>
      </form>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-900 text-gray-400 py-10 text-center">
    <div class="max-w-6xl mx-auto px-4">
      <p class="text-sm">&copy; 2026 My Project. Built with Tailwind CSS and HTML Wizard.</p>
    </div>
  </footer>

  <script src="main.js"></script>
</body>
</html>`,
      },
      {
        path: 'styles.css',
        content: `/* Additional custom styles beyond Tailwind utilities */

/* Smooth scrolling fallback for older browsers */
html {
  scroll-behavior: smooth;
}

/* Custom selection colour */
::selection {
  background-color: #3b82f6;
  color: #fff;
}

/* Focus-visible ring for keyboard users */
*:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}`,
      },
      {
        path: 'main.js',
        content: `// Your custom JavaScript here
console.log('Tailwind project loaded');`,
      },
    ],
  },
];
