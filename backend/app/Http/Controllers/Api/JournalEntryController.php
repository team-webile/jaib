<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalEntryController extends Controller
{
    public function index(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        $entries = $organization->journalEntries()
            ->with(['lines.account:id,name,code,type', 'createdBy:id,name'])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->from, fn($q) => $q->whereDate('date', '>=', $request->from))
            ->when($request->to, fn($q) => $q->whereDate('date', '<=', $request->to))
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return response()->json($entries);
    }

    public function store(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.account_id' => ['required', 'exists:accounts,id'],
            'lines.*.debit' => ['required', 'numeric', 'min:0'],
            'lines.*.credit' => ['required', 'numeric', 'min:0'],
            'lines.*.memo' => ['nullable', 'string'],
        ]);

        // Validate balanced entries
        $totalDebit = collect($validated['lines'])->sum('debit');
        $totalCredit = collect($validated['lines'])->sum('credit');

        if (round((float) $totalDebit, 4) !== round((float) $totalCredit, 4)) {
            return response()->json([
                'message' => 'Journal entry is not balanced',
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
            ], 422);
        }

        $entry = DB::transaction(function () use ($organization, $validated, $request) {
            $entry = $organization->journalEntries()->create([
                'entry_number' => JournalEntry::generateEntryNumber($organization->id),
                'date' => $validated['date'],
                'reference' => $validated['reference'] ?? null,
                'description' => $validated['description'] ?? null,
                'status' => 'posted',
                'created_by' => $request->user()->id,
            ]);

            foreach ($validated['lines'] as $line) {
                $entry->lines()->create([
                    'account_id' => $line['account_id'],
                    'debit' => $line['debit'],
                    'credit' => $line['credit'],
                    'memo' => $line['memo'] ?? null,
                ]);
            }

            return $entry;
        });

        return response()->json([
            'journal_entry' => $entry->load('lines.account'),
        ], 201);
    }

    public function show(Request $request, Organization $organization, JournalEntry $journalEntry): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        if ($journalEntry->organization_id !== $organization->id) {
            abort(404);
        }

        return response()->json([
            'journal_entry' => $journalEntry->load(['lines.account', 'createdBy:id,name']),
        ]);
    }

    public function update(Request $request, Organization $organization, JournalEntry $journalEntry): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        if ($journalEntry->organization_id !== $organization->id) {
            abort(404);
        }

        if ($journalEntry->isPosted()) {
            return response()->json(['message' => 'Cannot edit a posted entry'], 422);
        }

        $validated = $request->validate([
            'date' => ['sometimes', 'date'],
            'reference' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'lines' => ['sometimes', 'array', 'min:2'],
            'lines.*.account_id' => ['required', 'exists:accounts,id'],
            'lines.*.debit' => ['required', 'numeric', 'min:0'],
            'lines.*.credit' => ['required', 'numeric', 'min:0'],
            'lines.*.memo' => ['nullable', 'string'],
        ]);

        if (isset($validated['lines'])) {
            $totalDebit = collect($validated['lines'])->sum('debit');
            $totalCredit = collect($validated['lines'])->sum('credit');

            if (round((float) $totalDebit, 4) !== round((float) $totalCredit, 4)) {
                return response()->json(['message' => 'Journal entry is not balanced'], 422);
            }
        }

        DB::transaction(function () use ($journalEntry, $validated) {
            $journalEntry->update(array_filter([
                'date' => $validated['date'] ?? null,
                'reference' => $validated['reference'] ?? null,
                'description' => $validated['description'] ?? null,
            ], fn($v) => $v !== null));

            if (isset($validated['lines'])) {
                $journalEntry->lines()->delete();
                foreach ($validated['lines'] as $line) {
                    $journalEntry->lines()->create([
                        'account_id' => $line['account_id'],
                        'debit' => $line['debit'],
                        'credit' => $line['credit'],
                        'memo' => $line['memo'] ?? null,
                    ]);
                }
            }
        });

        return response()->json(['journal_entry' => $journalEntry->load('lines.account')]);
    }

    public function destroy(Request $request, Organization $organization, JournalEntry $journalEntry): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        if ($journalEntry->organization_id !== $organization->id) {
            abort(404);
        }

        $journalEntry->delete();

        return response()->json(null, 204);
    }

    public function post(Request $request, Organization $organization, JournalEntry $journalEntry): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        if ($journalEntry->organization_id !== $organization->id) {
            abort(404);
        }

        if ($journalEntry->isPosted()) {
            return response()->json(['message' => 'Already posted'], 422);
        }

        if (!$journalEntry->isBalanced()) {
            return response()->json(['message' => 'Cannot post an unbalanced entry'], 422);
        }

        $journalEntry->post();

        return response()->json(['journal_entry' => $journalEntry]);
    }

    public function unpost(Request $request, Organization $organization, JournalEntry $journalEntry): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        if ($journalEntry->organization_id !== $organization->id) {
            abort(404);
        }

        if (!$journalEntry->isPosted()) {
            return response()->json(['message' => 'Not posted'], 422);
        }

        $journalEntry->update(['status' => 'draft']);

        return response()->json(['journal_entry' => $journalEntry]);
    }

    private function authorizeMember($user, Organization $organization): void
    {
        if (!$user->isMemberOf($organization->id)) {
            abort(403, 'Not a member of this organization');
        }
    }
}
