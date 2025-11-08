@extends('layouts.app')

@section('title', $destination->name . ' - Weekend Getaway Guide | TravelTomorrow')
@section('description', $destination->description ?? "Discover $destination->name - the perfect weekend destination. Find great flight deals and travel tips.")
@section('og_image', $destination->hero_image ?? asset('images/destinations/default.jpg'))

@push('head')
<!-- JSON-LD Structured Data for TouristDestination -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  "name": "{{ $destination->name }}",
  "description": "{{ $destination->description }}",
  "image": "{{ $destination->hero_image ?? '' }}",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "{{ $destination->city }}",
    "addressCountry": "{{ $destination->country }}"
  },
  @if($airport)
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "{{ $airport->latitude }}",
    "longitude": "{{ $airport->longitude }}"
  },
  @endif
  @if($priceStats)
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "{{ $priceStats['currency'] }}",
    "lowPrice": "{{ $priceStats['min'] }}",
    "highPrice": "{{ $priceStats['max'] }}",
    "offerCount": "{{ $offers->count() }}"
  },
  @endif
  "url": "{{ route('destinations.show', $destination->slug) }}"
}
</script>

<!-- Breadcrumb Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "{{ route('home') }}"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Destinations",
      "item": "{{ route('destinations.index') }}"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "{{ $destination->name }}",
      "item": "{{ route('destinations.show', $destination->slug') }}"
    }
  ]
}
</script>
@endpush

@section('content')
<!-- Hero Section -->
<div class="relative h-96 bg-cover bg-center" style="background-image: url('{{ $destination->hero_image ?? asset("images/destinations/default.jpg") }}')">
    <div class="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70"></div>
    <div class="relative container mx-auto px-4 h-full flex flex-col justify-end pb-12">
        <nav class="text-sm text-white/80 mb-4">
            <a href="{{ route('home') }}" class="hover:text-white">Home</a>
            <span class="mx-2">/</span>
            <a href="{{ route('destinations.index') }}" class="hover:text-white">Destinations</a>
            <span class="mx-2">/</span>
            <span class="text-white">{{ $destination->name }}</span>
        </nav>
        <h1 class="text-5xl font-bold text-white mb-2">{{ $destination->name }}</h1>
        <p class="text-xl text-white/90">{{ $destination->city }}, {{ $destination->country }}</p>
    </div>
</div>

<!-- Main Content -->
<div class="container mx-auto px-4 py-12">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Column -->
        <div class="lg:col-span-2">
            <!-- Description -->
            <div class="bg-white rounded-lg shadow-sm p-8 mb-8">
                <h2 class="text-2xl font-bold mb-4">About {{ $destination->name }}</h2>
                <div class="prose max-w-none">
                    {!! nl2br(e($destination->description ?? 'Discover this amazing European destination perfect for a weekend getaway.')) !!}
                </div>
            </div>

            <!-- Current Deals -->
            @if($offers->isNotEmpty())
            <div class="bg-white rounded-lg shadow-sm p-8 mb-8">
                <h2 class="text-2xl font-bold mb-6">Current Flight Deals</h2>
                <div class="space-y-4">
                    @foreach($offers as $offer)
                    <div class="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-semibold text-lg">{{ $offer->origin }} → {{ $offer->destination }}</p>
                                <p class="text-sm text-gray-600">Round trip</p>
                            </div>
                            <div class="text-right">
                                <p class="text-3xl font-bold text-indigo-600">{{ $offer->total_amount }} {{ $offer->total_currency }}</p>
                                <a href="{{ env('APP_URL') }}/offers/{{ $offer->duffel_offer_id }}"
                                   class="inline-block mt-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition text-sm">
                                    View Deal
                                </a>
                            </div>
                        </div>
                    </div>
                    @endforeach
                </div>
            </div>
            @endif
        </div>

        <!-- Sidebar -->
        <div class="lg:col-span-1">
            <!-- Price Stats -->
            @if($priceStats)
            <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 class="font-bold text-lg mb-4">Price Insights</h3>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Average Price:</span>
                        <span class="font-semibold">€{{ $priceStats['average'] }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Best Deal:</span>
                        <span class="font-semibold text-green-600">€{{ $priceStats['min'] }}</span>
                    </div>
                    <div class="text-sm text-gray-500 mt-4">
                        Based on prices from the last 30 days
                    </div>
                </div>
            </div>
            @endif

            <!-- CTA Box -->
            <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <h3 class="font-bold text-xl mb-3">Ready to Go?</h3>
                <p class="mb-4 text-white/90">Spin the wheel to discover more destinations like {{ $destination->name }}</p>
                <a href="{{ env('APP_URL') }}/wheel"
                   class="block w-full bg-white text-indigo-600 text-center py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                    Spin the Wheel
                </a>
            </div>

            <!-- Related Destinations -->
            @if($relatedDestinations->isNotEmpty())
            <div class="bg-white rounded-lg shadow-sm p-6 mt-6">
                <h3 class="font-bold text-lg mb-4">Similar Destinations</h3>
                <div class="space-y-3">
                    @foreach($relatedDestinations as $related)
                    <a href="{{ route('destinations.show', $related->slug) }}"
                       class="block hover:bg-gray-50 p-2 rounded transition">
                        <p class="font-semibold">{{ $related->name }}</p>
                        <p class="text-sm text-gray-600">{{ $related->city }}, {{ $related->country }}</p>
                    </a>
                    @endforeach
                </div>
            </div>
            @endif
        </div>
    </div>
</div>
@endsection
