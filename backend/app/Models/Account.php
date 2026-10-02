<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'code',
        'name',
        'type',
        'sub_type',
        'description',
        'is_active',
        'opening_balance',
        'opening_balance_date',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'opening_balance' => 'decimal:4',
            'opening_balance_date' => 'date',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function journalEntryLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function balance(): float
    {
        $lines = $this->journalEntryLines()
            ->whereHas('journalEntry', fn($je) => $je->where('status', 'posted'))
            ->get();

        $debits = $lines->sum('debit');
        $credits = $lines->sum('credit');

        return match ($this->type) {
            'asset', 'expense' => $debits - $credits,
            'liability', 'equity', 'revenue' => $credits - $debits,
            default => 0,
        };
    }

    public function normalBalance(): string
    {
        return in_array($this->type, ['asset', 'expense']) ? 'debit' : 'credit';
    }
}
