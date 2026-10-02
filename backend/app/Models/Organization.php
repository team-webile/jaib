<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }

    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }

    public function owner(): BelongsToMany
    {
        return $this->users()->wherePivot('role', 'owner');
    }

    public function admins(): BelongsToMany
    {
        return $this->users()->wherePivotIn('role', ['owner', 'admin']);
    }

    public function accountants(): BelongsToMany
    {
        return $this->users()->wherePivotIn('role', ['owner', 'admin', 'accountant']);
    }

    public function members(): BelongsToMany
    {
        return $this->users()->wherePivotIn('role', ['owner', 'admin', 'accountant', 'viewer']);
    }

    public function getRoleForUser(User $user): ?string
    {
        return $this->users()
            ->where('user_id', $user->id)
            ->first()?->pivot->role;
    }
}
