<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class SitemapController extends Controller
{
    /**
     * Main sitemap index
     */
    public function index()
    {
        $sitemaps = [
            [
                'loc' => route('sitemap.destinations'),
                'lastmod' => now()->toAtomString(),
            ],
            [
                'loc' => route('sitemap.holidays'),
                'lastmod' => now()->toAtomString(),
            ],
        ];

        return response()->view('sitemap.index', ['sitemaps' => $sitemaps])
            ->header('Content-Type', 'application/xml');
    }

    /**
     * Destinations sitemap
     */
    public function destinations()
    {
        $destinations = DB::table('destinations')
            ->where('is_published', true)
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($destination) {
                return [
                    'loc' => route('destinations.show', $destination->slug),
                    'lastmod' => $destination->updated_at,
                    'changefreq' => 'weekly',
                    'priority' => '0.8',
                ];
            });

        return response()->view('sitemap.urlset', ['urls' => $destinations])
            ->header('Content-Type', 'application/xml');
    }

    /**
     * Bank holidays sitemap
     */
    public function holidays()
    {
        // In production, this would query bank_holidays table
        $urls = [];

        return response()->view('sitemap.urlset', ['urls' => $urls])
            ->header('Content-Type', 'application/xml');
    }
}
