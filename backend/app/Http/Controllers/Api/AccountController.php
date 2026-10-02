<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AccountController extends Controller
{
    public function index(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        $accounts = $organization->accounts()
            ->when($request->type, fn($q, $type) => $q->where('type', $type))
            ->when($request->sub_type, fn($q, $sub) => $q->where('sub_type', $sub))
            ->when($request->is_active !== null, fn($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('code')
            ->orderBy('name')
            ->get();

        return response()->json(['accounts' => $accounts]);
    }

    public function store(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50', 'unique:accounts,code,NULL,id,organization_id,' . $organization->id],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:asset,liability,equity,revenue,expense'],
            'sub_type' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'opening_balance' => ['nullable', 'numeric'],
            'opening_balance_date' => ['nullable', 'date'],
        ]);

        $account = $organization->accounts()->create($validated);

        return response()->json(['account' => $account], 201);
    }

    public function show(Request $request, Organization $organization, Account $account): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        if ($account->organization_id !== $organization->id) {
            abort(404, 'Account not found');
        }

        return response()->json(['account' => $account]);
    }

    public function update(Request $request, Organization $organization, Account $account): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        if ($account->organization_id !== $organization->id) {
            abort(404, 'Account not found');
        }

        $validated = $request->validate([
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'in:asset,liability,equity,revenue,expense'],
            'sub_type' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'opening_balance' => ['sometimes', 'numeric'],
            'opening_balance_date' => ['sometimes', 'nullable', 'date'],
        ]);

        $account->update($validated);

        return response()->json(['account' => $account]);
    }

    public function destroy(Request $request, Organization $organization, Account $account): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        if ($account->organization_id !== $organization->id) {
            abort(404, 'Account not found');
        }

        if ($account->journalEntryLines()->exists()) {
            return response()->json(['message' => 'Cannot delete account with journal entries'], 422);
        }

        $account->delete();

        return response()->json(null, 204);
    }

    public function balance(Request $request, Organization $organization, Account $account): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        if ($account->organization_id !== $organization->id) {
            abort(404, 'Account not found');
        }

        return response()->json([
            'account' => $account,
            'balance' => $account->balance(),
            'normal_balance' => $account->normalBalance(),
        ]);
    }

    private function authorizeMember($user, Organization $organization): void
    {
        if (!$user->isMemberOf($organization->id)) {
            abort(403, 'Not a member of this organization');
        }
    }
}
