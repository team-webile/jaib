<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\JournalEntryLine;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        $accounts = $organization->accounts()->where('is_active', true)->get();

        $assetAccounts = $accounts->where('type', 'asset');
        $liabilityAccounts = $accounts->where('type', 'liability');
        $equityAccounts = $accounts->where('type', 'equity');
        $revenueAccounts = $accounts->where('type', 'revenue');
        $expenseAccounts = $accounts->where('type', 'expense');

        $totalAssets = $assetAccounts->sum(fn($a) => $a->balance());
        $totalLiabilities = $liabilityAccounts->sum(fn($a) => $a->balance());
        $totalEquity = $equityAccounts->sum(fn($a) => $a->balance());
        $totalRevenue = $revenueAccounts->sum(fn($a) => $a->balance());
        $totalExpenses = $expenseAccounts->sum(fn($a) => $a->balance());

        $netIncome = $totalRevenue - $totalExpenses;

        return response()->json([
            'summary' => [
                'total_assets' => $totalAssets,
                'total_liabilities' => $totalLiabilities,
                'total_equity' => $totalEquity,
                'total_revenue' => $totalRevenue,
                'total_expenses' => $totalExpenses,
                'net_income' => $netIncome,
                'account_count' => $accounts->count(),
                'entry_count' => $organization->journalEntries()->where('status', 'posted')->count(),
            ],
        ]);
    }

    public function balanceSheet(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        $asOfDate = $request->date('as_of_date', now()->toDateString());

        $assetAccounts = $organization->accounts()
            ->where('type', 'asset')
            ->where('is_active', true)
            ->with(['journalEntryLines' => fn($q) => $q->whereHas('journalEntry', fn($je) => $je->where('status', 'posted')->whereDate('date', '<=', $asOfDate))])
            ->get();

        $liabilityAccounts = $organization->accounts()
            ->where('type', 'liability')
            ->where('is_active', true)
            ->with(['journalEntryLines' => fn($q) => $q->whereHas('journalEntry', fn($je) => $je->where('status', 'posted')->whereDate('date', '<=', $asOfDate))])
            ->get();

        $equityAccounts = $organization->accounts()
            ->where('type', 'equity')
            ->where('is_active', true)
            ->with(['journalEntryLines' => fn($q) => $q->whereHas('journalEntry', fn($je) => $je->where('status', 'posted')->whereDate('date', '<=', $asOfDate))])
            ->get();

        // Retained earnings = net income to date
        $revenueAccounts = $organization->accounts()
            ->where('type', 'revenue')
            ->where('is_active', true)
            ->with(['journalEntryLines' => fn($q) => $q->whereHas('journalEntry', fn($je) => $je->where('status', 'posted')->whereDate('date', '<=', $asOfDate))])
            ->get();

        $expenseAccounts = $organization->accounts()
            ->where('type', 'expense')
            ->where('is_active', true)
            ->with(['journalEntryLines' => fn($q) => $q->whereHas('journalEntry', fn($je) => $je->where('status', 'posted')->whereDate('date', '<=', $asOfDate))])
            ->get();

        $totalAssets = $assetAccounts->sum(fn($a) => $a->balance());
        $totalLiabilities = $liabilityAccounts->sum(fn($a) => $a->balance());
        $netIncome = $revenueAccounts->sum(fn($a) => $a->balance()) - $expenseAccounts->sum(fn($a) => $a->balance());
        $totalEquity = $equityAccounts->sum(fn($a) => $a->balance()) + $netIncome;

        return response()->json([
            'as_of_date' => $asOfDate,
            'assets' => [
                'accounts' => $assetAccounts->map(fn($a) => ['id' => $a->id, 'name' => $a->name, 'code' => $a->code, 'balance' => $a->balance()]),
                'total' => $totalAssets,
            ],
            'liabilities' => [
                'accounts' => $liabilityAccounts->map(fn($a) => ['id' => $a->id, 'name' => $a->name, 'code' => $a->code, 'balance' => $a->balance()]),
                'total' => $totalLiabilities,
            ],
            'equity' => [
                'accounts' => $equityAccounts->map(fn($a) => ['id' => $a->id, 'name' => $a->name, 'code' => $a->code, 'balance' => $a->balance()]),
                'retained_earnings' => $netIncome,
                'total' => $totalEquity,
            ],
            'total_liabilities_and_equity' => $totalLiabilities + $totalEquity,
            'is_balanced' => round($totalAssets, 4) === round($totalLiabilities + $totalEquity, 4),
        ]);
    }

    public function incomeStatement(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        $fromDate = $request->date('from_date', now()->startOfYear()->toDateString());
        $toDate = $request->date('to_date', now()->toDateString());

        $revenueAccounts = $organization->accounts()
            ->where('type', 'revenue')
            ->where('is_active', true)
            ->with(['journalEntryLines' => fn($q) => $q->whereHas('journalEntry', fn($je) => $je->where('status', 'posted')->whereBetween('date', [$fromDate, $toDate]))])
            ->get();

        $expenseAccounts = $organization->accounts()
            ->where('type', 'expense')
            ->where('is_active', true)
            ->with(['journalEntryLines' => fn($q) => $q->whereHas('journalEntry', fn($je) => $je->where('status', 'posted')->whereBetween('date', [$fromDate, $toDate]))])
            ->get();

        $totalRevenue = $revenueAccounts->sum(fn($a) => $a->balance());
        $totalExpenses = $expenseAccounts->sum(fn($a) => $a->balance());
        $netIncome = $totalRevenue - $totalExpenses;

        return response()->json([
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'revenue' => [
                'accounts' => $revenueAccounts->map(fn($a) => ['id' => $a->id, 'name' => $a->name, 'code' => $a->code, 'balance' => $a->balance()]),
                'total' => $totalRevenue,
            ],
            'expenses' => [
                'accounts' => $expenseAccounts->map(fn($a) => ['id' => $a->id, 'name' => $a->name, 'code' => $a->code, 'balance' => $a->balance()]),
                'total' => $totalExpenses,
            ],
            'net_income' => $netIncome,
        ]);
    }

    private function authorizeMember($user, Organization $organization): void
    {
        if (!$user->isMemberOf($organization->id)) {
            abort(403, 'Not a member of this organization');
        }
    }
}
