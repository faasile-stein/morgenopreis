<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class HomeController extends Controller
{
    /**
     * Display the homepage
     */
    public function index()
    {
        // Get featured destinations
        $featuredDestinations = DB::table('destinations')
            ->where('is_published', true)
            ->where('is_featured', true)
            ->orderBy('name')
            ->limit(6)
            ->get();

        // Get popular airports
        $popularAirports = DB::table('airports')
            ->where('is_popular', true)
            ->where('is_active', true)
            ->orderBy('city')
            ->limit(8)
            ->get();

        // Get recent deals (best prices)
        $recentDeals = DB::table('offers')
            ->where('expires_at', '>', now())
            ->orderBy('total_amount')
            ->limit(4)
            ->get();

        return view('home', [
            'featuredDestinations' => $featuredDestinations,
            'popularAirports' => $popularAirports,
            'recentDeals' => $recentDeals,
        ]);
    }
}
