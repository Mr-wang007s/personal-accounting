enum RecordType { income, expense }

class AccountRecord {
  final String id;
  final String? clientId;
  final RecordType type;
  final double amount;
  final String category;
  final DateTime date;
  final String? note;
  final String ledgerId;
  final DateTime createdAt;
  final DateTime updatedAt;

  AccountRecord({
    required this.id,
    this.clientId,
    required this.type,
    required this.amount,
    required this.category,
    required this.date,
    this.note,
    required this.ledgerId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AccountRecord.fromJson(Map<String, dynamic> json) {
    return AccountRecord(
      id: json['id'] as String,
      clientId: json['clientId'] as String?,
      type: json['type'] == 'income' ? RecordType.income : RecordType.expense,
      amount: (json['amount'] is String 
          ? double.parse(json['amount']) 
          : (json['amount'] as num).toDouble()),
      category: json['category'] as String,
      date: DateTime.parse(json['date'] as String),
      note: json['note'] as String?,
      ledgerId: json['ledgerId'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'clientId': clientId,
      'type': type == RecordType.income ? 'income' : 'expense',
      'amount': amount,
      'category': category,
      'date': date.toIso8601String().split('T')[0],
      'note': note,
      'ledgerId': ledgerId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  AccountRecord copyWith({
    String? id,
    String? clientId,
    RecordType? type,
    double? amount,
    String? category,
    DateTime? date,
    String? note,
    String? ledgerId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return AccountRecord(
      id: id ?? this.id,
      clientId: clientId ?? this.clientId,
      type: type ?? this.type,
      amount: amount ?? this.amount,
      category: category ?? this.category,
      date: date ?? this.date,
      note: note ?? this.note,
      ledgerId: ledgerId ?? this.ledgerId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class RecordStatistics {
  final double totalIncome;
  final double totalExpense;
  final double balance;
  final int recordCount;

  RecordStatistics({
    required this.totalIncome,
    required this.totalExpense,
    required this.balance,
    required this.recordCount,
  });

  factory RecordStatistics.fromJson(Map<String, dynamic> json) {
    final income = (json['totalIncome'] is String 
        ? double.parse(json['totalIncome']) 
        : (json['totalIncome'] as num?)?.toDouble()) ?? 0.0;
    final expense = (json['totalExpense'] is String 
        ? double.parse(json['totalExpense']) 
        : (json['totalExpense'] as num?)?.toDouble()) ?? 0.0;
    
    return RecordStatistics(
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      recordCount: json['recordCount'] as int? ?? 0,
    );
  }
}

class CategoryBreakdown {
  final String category;
  final double amount;
  final int count;
  final double percentage;

  CategoryBreakdown({
    required this.category,
    required this.amount,
    required this.count,
    required this.percentage,
  });

  factory CategoryBreakdown.fromJson(Map<String, dynamic> json) {
    return CategoryBreakdown(
      category: json['category'] as String,
      amount: (json['amount'] is String 
          ? double.parse(json['amount']) 
          : (json['amount'] as num).toDouble()),
      count: json['count'] as int? ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class MonthlyTrend {
  final String month;
  final double income;
  final double expense;

  MonthlyTrend({
    required this.month,
    required this.income,
    required this.expense,
  });

  factory MonthlyTrend.fromJson(Map<String, dynamic> json) {
    return MonthlyTrend(
      month: json['month'] as String,
      income: (json['income'] is String 
          ? double.parse(json['income']) 
          : (json['income'] as num?)?.toDouble()) ?? 0.0,
      expense: (json['expense'] is String 
          ? double.parse(json['expense']) 
          : (json['expense'] as num?)?.toDouble()) ?? 0.0,
    );
  }
}
