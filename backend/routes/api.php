<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\JournalEntryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\OrganizationController;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    // Organizations
    Route::apiResource('organizations', OrganizationController::class);
    Route::post('/organizations/{organization}/invite', [OrganizationController::class, 'invite']);
    Route::put('/organizations/{organization}/users/{user}', [OrganizationController::class, 'updateMemberRole']);
    Route::delete('/organizations/{organization}/users/{user}', [OrganizationController::class, 'removeMember']);

    // Accounts (scoped to organization)
    Route::get('/organizations/{organization}/accounts', [AccountController::class, 'index']);
    Route::post('/organizations/{organization}/accounts', [AccountController::class, 'store']);
    Route::get('/organizations/{organization}/accounts/{account}', [AccountController::class, 'show']);
    Route::put('/organizations/{organization}/accounts/{account}', [AccountController::class, 'update']);
    Route::delete('/organizations/{organization}/accounts/{account}', [AccountController::class, 'destroy']);
    Route::get('/organizations/{organization}/accounts/{account}/balance', [AccountController::class, 'balance']);

    // Journal Entries (scoped to organization)
    Route::get('/organizations/{organization}/journal-entries', [JournalEntryController::class, 'index']);
    Route::post('/organizations/{organization}/journal-entries', [JournalEntryController::class, 'store']);
    Route::get('/organizations/{organization}/journal-entries/{journalEntry}', [JournalEntryController::class, 'show']);
    Route::put('/organizations/{organization}/journal-entries/{journalEntry}', [JournalEntryController::class, 'update']);
    Route::delete('/organizations/{organization}/journal-entries/{journalEntry}', [JournalEntryController::class, 'destroy']);
    Route::post('/organizations/{organization}/journal-entries/{journalEntry}/post', [JournalEntryController::class, 'post']);
    Route::post('/organizations/{organization}/journal-entries/{journalEntry}/unpost', [JournalEntryController::class, 'unpost']);

    // Dashboard
    Route::get('/organizations/{organization}/dashboard', [DashboardController::class, 'index']);
    Route::get('/organizations/{organization}/balance-sheet', [DashboardController::class, 'balanceSheet']);
    Route::get('/organizations/{organization}/income-statement', [DashboardController::class, 'incomeStatement']);
});
