<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\DestinationController;
use App\Http\Controllers\BankHolidayController;
use App\Http\Controllers\SitemapController;

/*
|--------------------------------------------------------------------------
| Web Routes - TravelTomorrow SEO Website
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application.
| These routes are SEO-optimized with clean URLs and server-side rendering.
|
*/

// Homepage - Featured destinations and wheel CTA
Route::get('/', [HomeController::class, 'index'])->name('home');

// Destination pages - SEO-rich content with JSON-LD
Route::get('/destinations', [DestinationController::class, 'index'])->name('destinations.index');
Route::get('/destinations/{slug}', [DestinationController::class, 'show'])->name('destinations.show');

// Bank Holiday pages - Country-specific holiday deals
Route::get('/bank-holidays', [BankHolidayController::class, 'index'])->name('bank-holidays.index');
Route::get('/bank-holidays/{country}', [BankHolidayController::class, 'country'])->name('bank-holidays.country');
Route::get('/bank-holidays/{country}/{slug}', [BankHolidayController::class, 'show'])->name('bank-holidays.show');

// Category/Tag pages
Route::get('/weekend-trips', [DestinationController::class, 'weekendTrips'])->name('weekend-trips');
Route::get('/city-breaks', [DestinationController::class, 'cityBreaks'])->name('city-breaks');
Route::get('/romantic-getaways', [DestinationController::class, 'romanticGetaways'])->name('romantic-getaways');

// SEO utilities
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');
Route::get('/sitemap-destinations.xml', [SitemapController::class, 'destinations'])->name('sitemap.destinations');
Route::get('/sitemap-holidays.xml', [SitemapController::class, 'holidays'])->name('sitemap.holidays');

// Static pages
Route::view('/about', 'pages.about')->name('about');
Route::view('/how-it-works', 'pages.how-it-works')->name('how-it-works');
Route::view('/privacy', 'pages.privacy')->name('privacy');
Route::view('/terms', 'pages.terms')->name('terms');
