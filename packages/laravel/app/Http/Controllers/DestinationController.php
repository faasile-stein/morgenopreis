<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DestinationController extends Controller
{
    /**
     * Display a listing of all destinations
     */
    public function index(Request $request)
    {
        $query = DB::table('destinations')
            ->where('is_published', true)
            ->orderBy('name');

        // Filter by country if specified
        if ($request->has('country')) {
            $query->where('country', $request->country);
        }

        // Filter by tags
        if ($request->has('tag')) {
            $query->whereRaw("tags @> ?", [json_encode([$request->tag])]);
        }

        $destinations = $query->paginate(12);

        return view('destinations.index', [
            'destinations' => $destinations,
            'title' => 'Discover Weekend Getaways Across Europe',
            'description' => 'Explore curated weekend destinations. Spin the wheel for instant travel inspiration and great deals.',
        ]);
    }

    /**
     * Display a single destination
     */
    public function show(string $slug)
    {
        $destination = DB::table('destinations')
            ->where('slug', $slug)
            ->where('is_published', true)
            ->first();

        if (!$destination) {
            abort(404);
        }

        // Get airport information
        $airport = DB::table('airports')
            ->where('iata_code', $destination->primary_airport_iata)
            ->first();

        // Get recent offers for this destination
        $recentOffers = DB::table('offers')
            ->where('destination', $destination->primary_airport_iata)
            ->where('expires_at', '>', now())
            ->orderBy('total_amount')
            ->limit(3)
            ->get();

        // Calculate price statistics
        $priceStats = $this->getPriceStatistics($destination->id);

        // Get recommended nearby destinations
        $relatedDestinations = DB::table('destinations')
            ->where('country', $destination->country)
            ->where('id', '!=', $destination->id)
            ->where('is_published', true)
            ->limit(4)
            ->get();

        return view('destinations.show', [
            'destination' => $destination,
            'airport' => $airport,
            'offers' => $recentOffers,
            'priceStats' => $priceStats,
            'relatedDestinations' => $relatedDestinations,
        ]);
    }

    /**
     * Weekend trips category page
     */
    public function weekendTrips()
    {
        $destinations = DB::table('destinations')
            ->where('is_published', true)
            ->whereRaw("tags @> ?", [json_encode(['weekend'])])
            ->orderBy('name')
            ->paginate(12);

        return view('destinations.category', [
            'destinations' => $destinations,
            'title' => 'Best Weekend Trips in Europe',
            'description' => 'Quick getaways perfect for a weekend. Discover cities just 2-3 hours away.',
            'category' => 'weekend',
        ]);
    }

    /**
     * City breaks category page
     */
    public function cityBreaks()
    {
        $destinations = DB::table('destinations')
            ->where('is_published', true)
            ->whereRaw("tags @> ?", [json_encode(['city-break'])])
            ->orderBy('name')
            ->paginate(12);

        return view('destinations.category', [
            'destinations' => $destinations,
            'title' => 'City Break Destinations',
            'description' => 'Explore vibrant European cities for unforgettable short breaks.',
            'category' => 'city-break',
        ]);
    }

    /**
     * Romantic getaways category page
     */
    public function romanticGetaways()
    {
        $destinations = DB::table('destinations')
            ->where('is_published', true)
            ->whereRaw("tags @> ?", [json_encode(['romantic'])])
            ->orderBy('name')
            ->paginate(12);

        return view('destinations.category', [
            'destinations' => $destinations,
            'title' => 'Romantic Getaways for Couples',
            'description' => 'Perfect destinations for a romantic escape with your partner.',
            'category' => 'romantic',
        ]);
    }

    /**
     * Get price statistics for a destination
     */
    private function getPriceStatistics(string $destinationId)
    {
        $thirtyDaysAgo = now()->subDays(30);

        $prices = DB::table('price_history')
            ->join('destinations', function($join) use ($destinationId) {
                $join->on('price_history.destination', '=', 'destinations.primary_airport_iata')
                     ->where('destinations.id', '=', $destinationId);
            })
            ->where('price_history.created_at', '>=', $thirtyDaysAgo)
            ->pluck('price')
            ->map(fn($price) => (float) $price);

        if ($prices->isEmpty()) {
            return null;
        }

        return [
            'average' => round($prices->avg(), 2),
            'min' => $prices->min(),
            'max' => $prices->max(),
            'currency' => 'EUR',
        ];
    }
}
