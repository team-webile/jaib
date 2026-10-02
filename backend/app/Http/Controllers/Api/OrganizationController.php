<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrganizationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organizations = $request->user()->organizations()->with('users:id,name,email')->get();

        return response()->json(['organizations' => $organizations]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $slug = Str::slug($validated['name']) . '-' . Str::random(6);

        $organization = Organization::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
        ]);

        // Attach the creating user as owner
        $organization->users()->attach($request->user()->id, ['role' => 'owner']);

        return response()->json(['organization' => $organization->load('users')], 201);
    }

    public function show(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeMember($request->user(), $organization);

        return response()->json(['organization' => $organization->load('users:id,name,email')]);
    }

    public function update(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeAdmin($request->user(), $organization);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $organization->update($validated);

        return response()->json(['organization' => $organization]);
    }

    public function destroy(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeOwner($request->user(), $organization);

        $organization->delete();

        return response()->json(null, 204);
    }

    public function invite(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeAdmin($request->user(), $organization);

        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'role' => ['required', 'in:admin,accountant,viewer'],
        ]);

        $user = User::where('email', $validated['email'])->firstOrFail();

        if ($organization->users()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'User is already a member'], 422);
        }

        $organization->users()->attach($user->id, ['role' => $validated['role']]);

        return response()->json(['message' => 'User invited', 'user' => $user], 201);
    }

    public function updateMemberRole(Request $request, Organization $organization, User $user): JsonResponse
    {
        $this->authorizeAdmin($request->user(), $organization);

        $validated = $request->validate([
            'role' => ['required', 'in:admin,accountant,viewer'],
        ]);

        $membership = $organization->users()->where('user_id', $user->id)->first();

        if (!$membership) {
            return response()->json(['message' => 'User is not a member'], 404);
        }

        // Prevent demoting the last owner
        if ($membership->pivot->role === 'owner' && $validated['role'] !== 'owner') {
            $ownerCount = $organization->users()->wherePivot('role', 'owner')->count();
            if ($ownerCount <= 1) {
                return response()->json(['message' => 'Cannot demote the last owner'], 422);
            }
        }

        $organization->users()->updateExistingPivot($user->id, ['role' => $validated['role']]);

        return response()->json(['message' => 'Role updated']);
    }

    public function removeMember(Request $request, Organization $organization, User $user): JsonResponse
    {
        $this->authorizeAdmin($request->user(), $organization);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot remove yourself'], 422);
        }

        $membership = $organization->users()->where('user_id', $user->id)->first();

        if (!$membership) {
            return response()->json(['message' => 'User is not a member'], 404);
        }

        if ($membership->pivot->role === 'owner') {
            $ownerCount = $organization->users()->wherePivot('role', 'owner')->count();
            if ($ownerCount <= 1) {
                return response()->json(['message' => 'Cannot remove the last owner'], 422);
            }
        }

        $organization->users()->detach($user->id);

        return response()->json(null, 204);
    }

    private function authorizeMember(User $user, Organization $organization): void
    {
        if (!$user->isMemberOf($organization->id)) {
            abort(403, 'Not a member of this organization');
        }
    }

    private function authorizeAdmin(User $user, Organization $organization): void
    {
        if (!$user->isAdminOf($organization)) {
            abort(403, 'Admin access required');
        }
    }

    private function authorizeOwner(User $user, Organization $organization): void
    {
        if (!$user->isOwnerOf($organization)) {
            abort(403, 'Owner access required');
        }
    }
}
