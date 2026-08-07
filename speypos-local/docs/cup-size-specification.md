# Cup Size Specification

## 1. Purpose

This specification defines cup-size behavior for menu configuration, order capture, reporting, and external order data. A cup size is a reusable business definition such as `18 oz`, `20 oz`, `22 oz`, or `32 oz`.

Cup-size ownership belongs to the business domain. A user interface may present cup-size-related choices, but it must not be the authority that determines the final cup size recorded for an order item.

## 2. Core Definitions

### 2.1 Cup Size

A cup size has these attributes:

| Attribute | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Stable identifier for the cup size. |
| `size` | Yes | The size value, normally a numeric value such as `18` or `32`. |
| `unit` | Yes | The measurement unit, such as `oz` or `ml`. |
| `created_at` | Yes | Creation timestamp. |
| `updated_at` | No | Most recent update timestamp. |

The pair `(size, unit)` must be unique. Leading and trailing whitespace is removed before a cup size is created or updated.

### 2.2 Menu Item Cup-Size Mapping

A menu item may be linked to zero or one cup size. Assigning a cup size replaces any previous item cup-size assignment.

### 2.3 Menu Category Cup-Size Mapping

A menu category may be linked to zero or one cup size. Assigning a cup size replaces any previous category cup-size assignment.

### 2.4 Customization Option Cup-Size Target

A customization option may optionally target one cup size. This supports choices such as an upsize option that changes the effective cup size of an order item.

A customization option without a cup-size target remains an ordinary customization option.

## 3. Effective Menu Configuration

The effective cup size for a menu item is resolved as follows:

1. If the item has a direct item-to-cup-size assignment, use it.
2. Otherwise, inspect the item's categories in their supplied order and use the first category with a cup-size assignment.
3. If neither source provides a cup size, no effective cup size exists.

Direct item assignment therefore overrides category assignment.

## 4. Cup-Size Ordering

Whenever cup sizes are shown or summarized, they must be ordered by their numeric `size` value in ascending order.

Example:

```text
18 oz
20 oz
22 oz
32 oz
```

The ordering rules are:

1. Numeric size values sort before nonnumeric values.
2. Numeric values sort in ascending numeric order, not alphabetical order.
3. When numeric values are equal, sort by the textual size value, then by unit.
4. Nonnumeric size values sort alphabetically by size, then by unit.
5. In sales summaries, the `Unknown` bucket always appears last.

This rule applies to configuration lists, effective cup-size lists, administrative selections, shift-close summaries, day-close summaries, and external report formatting.

## 5. Order Item Canonicalization

Each order item may have zero or one canonical cup-size snapshot.

The canonical snapshot is stored as an order-item customization with:

| Attribute | Value |
| --- | --- |
| `option_type` | `cup_size` |
| `value` | The stable cup-size identifier. |
| `name` | A human-readable label in the form `<size> (<unit>)`, for example `20 (oz)`. |
| `price` | `0` for the canonical cup-size snapshot itself. |

The canonical snapshot is an internal business record used for reporting and downstream data. It is distinct from the original customization option selected by the user.

### 5.1 Resolution During Order Acceptance

For each submitted order item:

1. Inspect selected customization options in their submitted order.
2. Collect the cup-size targets of selected options.
3. If one or more selected options target cup sizes, the last selected target is the effective cup size.
4. Otherwise, use a submitted legacy cup-size value when one is present.
5. Remove all submitted cup-size customization rows.
6. Preserve all non-cup-size customizations.
7. Add exactly one canonical cup-size snapshot when an effective cup size was resolved.

A selected customization option is normalized to its authoritative label before it is retained in the order item. This prevents caller-supplied labels from replacing configured option labels.

### 5.2 Compatibility

Older order submissions may provide a cup size directly as a cup-size customization. These submissions remain supported. The direct value is converted into the same canonical snapshot format and is not duplicated.

## 6. Presentation Rules

### 6.1 Order Completion Detail

Order-completion detail lists show the original non-cup-size customization names and topping details.

The canonical `cup_size` snapshot must not be displayed as a normal order customization. For example, when an order contains:

```text
Canonical cup-size snapshot: 20 (oz)
Selected customization option: Upsize
```

The order-completion detail shows:

```text
Upsize
```

It does not show `20 (oz)` as a customization.

### 6.2 Order History and Other Detail Views

Views that present raw order-item customization records may include the canonical cup-size snapshot when that information is useful to the business. Such views must preserve the distinction between the canonical snapshot and the original customization option.

## 7. Reporting Rules

Cup-size summaries count quantities from completed order items only. Voided order items do not contribute to cup-size totals.

For every completed order item, report resolution uses this fallback chain:

1. The valid canonical cup-size snapshot on the order item.
2. A valid direct item-to-cup-size mapping.
3. A valid category-to-cup-size mapping through one of the item's categories.
4. `Unknown` when no cup size can be resolved.

A valid cup size is one that still resolves to an existing cup-size definition. An invalid or stale canonical identifier does not block later fallback steps.

The quantity of the order item is added to the resolved cup-size bucket. Each order item contributes to exactly one bucket.

Example:

```text
18 oz: 40
20 oz: 30
22 oz: 20
32 oz: 10
Unknown: 2
```

### 7.1 Shift Close

A shift-close report includes a cup-size summary after its order and item totals, before payment and revenue breakdowns.

### 7.2 Day Close

A day-close report includes:

- A cup-size summary for each included shift.
- A combined cup-size summary across all included shifts.

Combined quantities are the sum of same-identifier buckets from the included shifts. The combined summary uses the ordering in Section 4.

### 7.3 Review and Preview

Shift-close and day-close review views consume the authoritative report summary rather than independently recreating the fallback chain. The cup-size summary appears below the primary order, item, and revenue metrics.

## 8. External Order Data

When an order item is shared with another system, it includes a cup-size snapshot when a canonical cup-size customization exists:

```json
{
  "cup_size": {
    "id": "stable-cup-size-id",
    "name": "20 (oz)"
  }
}
```

When no canonical cup-size snapshot exists, `cup_size` is `null`.

The item's full customization list remains available separately. Consumers should use the explicit `cup_size` field for cup-size semantics rather than inferring it from display text.

## 9. Integrity Requirements

1. A cup size cannot be duplicated by `(size, unit)`.
2. A mapping cannot duplicate the same menu item/category and cup-size pairing.
3. A canonical cup-size snapshot must use the stable cup-size identifier as its `value`.
4. Each normalized order item contains at most one canonical cup-size snapshot.
5. Reports must never use a raw identifier as the displayed cup-size label.
6. Presentation ordering must follow Section 4; quantity does not determine display order.
7. The canonical snapshot is authoritative for a completed order item, even if later configuration mappings change.

## 10. Examples

### 10.1 Item Configuration

```text
Category: Iced Drinks
Category cup size: 18 oz

Item: Iced Latte
Direct item cup size: 32 oz

Effective cup size for Iced Latte: 32 oz
```

The direct item assignment replaces the category assignment for that item.

### 10.2 Option-Driven Upsize

```text
Customization option: Upsize
Cup-size target: 32 oz
```

When `Upsize` is selected, the normalized order item retains `Upsize` as an option customization and records one canonical `32 (oz)` cup-size snapshot.

### 10.3 Reporting Fallback

```text
Order item A: canonical snapshot = 22 oz
Order item B: no snapshot; item mapping = 20 oz
Order item C: no snapshot or item mapping; category mapping = 18 oz
Order item D: no resolvable source
```

The report resolves them as:

```text
18 oz
20 oz
22 oz
Unknown
```
