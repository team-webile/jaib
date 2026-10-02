<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    public function ownedOrganizations()
    {
        return $this->organizations()->wherePivot('role', 'owner');
    }

    public function isOwnerOf(Organization $organization): bool
    {
        return $this->organizations()
            ->where('organization_id', $organization->id)
            ->where('role', 'owner')
            ->exists();
    }

    public function isAdminOf(Organization $organization): bool
    {
        return in_array(
            $this->organizations()
                ->where('organization_id', $organization->id)
                ->first()?->pivot->role,
            ['owner', 'admin']
        );
    }

    public function isMemberOf(int $organizationId): bool
    {
        return $this->organizations()->where('organization_id', $organizationId)->exists();
    }
}
