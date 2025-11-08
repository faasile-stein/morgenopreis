<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>@yield('title', 'TravelTomorrow - Spin the Wheel for Weekend Getaways')</title>
    <meta name="description" content="@yield('description', 'Discover weekend destinations across Europe. Spin the wheel and find your next adventure with great flight deals.')">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:title" content="@yield('title', 'TravelTomorrow')">
    <meta property="og:description" content="@yield('description')">
    <meta property="og:image" content="@yield('og_image', asset('images/og-default.jpg'))">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="{{ url()->current() }}">
    <meta property="twitter:title" content="@yield('title')">
    <meta property="twitter:description" content="@yield('description')">
    <meta property="twitter:image" content="@yield('og_image', asset('images/og-default.jpg'))">

    <!-- Canonical URL -->
    <link rel="canonical" href="{{ url()->current() }}">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />

    <!-- Styles -->
    <script src="https://cdn.tailwindcss.com"></script>

    @stack('head')
</head>
<body class="bg-gray-50 text-gray-900 antialiased">
    <!-- Header -->
    <header class="bg-white shadow-sm">
        <nav class="container mx-auto px-4 py-4 flex items-center justify-between">
            <a href="{{ route('home') }}" class="text-2xl font-bold text-indigo-600">
                ✈️ TravelTomorrow
            </a>
            <div class="hidden md:flex space-x-6">
                <a href="{{ route('destinations.index') }}" class="text-gray-700 hover:text-indigo-600">Destinations</a>
                <a href="{{ route('weekend-trips') }}" class="text-gray-700 hover:text-indigo-600">Weekend Trips</a>
                <a href="{{ route('bank-holidays.index') }}" class="text-gray-700 hover:text-indigo-600">Bank Holidays</a>
                <a href="{{ route('how-it-works') }}" class="text-gray-700 hover:text-indigo-600">How It Works</a>
            </div>
            <a href="{{ env('APP_URL', 'http://localhost:3000') }}/wheel"
               class="bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition">
                Spin the Wheel
            </a>
        </nav>
    </header>

    <!-- Main Content -->
    <main>
        @yield('content')
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-300 mt-20">
        <div class="container mx-auto px-4 py-12">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <h3 class="text-white font-bold text-lg mb-4">TravelTomorrow</h3>
                    <p class="text-sm">Spin the wheel for instant weekend getaway inspiration across Europe.</p>
                </div>
                <div>
                    <h4 class="text-white font-semibold mb-4">Explore</h4>
                    <ul class="space-y-2 text-sm">
                        <li><a href="{{ route('destinations.index') }}" class="hover:text-white">All Destinations</a></li>
                        <li><a href="{{ route('weekend-trips') }}" class="hover:text-white">Weekend Trips</a></li>
                        <li><a href="{{ route('city-breaks') }}" class="hover:text-white">City Breaks</a></li>
                        <li><a href="{{ route('romantic-getaways') }}" class="hover:text-white">Romantic Getaways</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="text-white font-semibold mb-4">Company</h4>
                    <ul class="space-y-2 text-sm">
                        <li><a href="{{ route('about') }}" class="hover:text-white">About Us</a></li>
                        <li><a href="{{ route('how-it-works') }}" class="hover:text-white">How It Works</a></li>
                        <li><a href="{{ route('privacy') }}" class="hover:text-white">Privacy Policy</a></li>
                        <li><a href="{{ route('terms') }}" class="hover:text-white">Terms of Service</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="text-white font-semibold mb-4">Connect</h4>
                    <p class="text-sm">Follow us for travel inspiration and exclusive deals.</p>
                </div>
            </div>
            <div class="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
                <p>&copy; {{ date('Y') }} TravelTomorrow. All rights reserved.</p>
            </div>
        </div>
    </footer>

    @stack('scripts')
</body>
</html>
