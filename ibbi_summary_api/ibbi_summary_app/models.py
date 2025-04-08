from django.db import models

class CorporateInsolvency(models.Model):
    s_no = models.AutoField(primary_key=True)  # Auto-incrementing primary key
    source_name = models.CharField(max_length=100)
    cin_number = models.CharField(max_length=100)
    name_of_corporate_debtor = models.CharField(max_length=255)
    triggered_by = models.CharField(max_length=100)
    nclt_bench = models.CharField(max_length=100)
    defunct_yes_no = models.CharField(max_length=10)
    date_of_commencement_of_insolvency = models.CharField(max_length=20)
    date_of_nclt_order_approving_resolution = models.CharField(max_length=20)
    date_of_order_of_liquidation = models.CharField(max_length=20)
    total_admitted_claims_during_cirp = models.DecimalField(max_digits=20, decimal_places=2)
    total_admitted_claims = models.DecimalField(max_digits=20, decimal_places=2)
    admitted_claims_of_fcs_during_cirp = models.DecimalField(max_digits=20, decimal_places=2)
    admitted_claims_of_fcs = models.DecimalField(max_digits=20, decimal_places=2)
    admitted_claims_of_ocs_during_cirp = models.DecimalField(max_digits=20, decimal_places=2)
    admitted_claims_of_ocs = models.DecimalField(max_digits=20, decimal_places=2)
    no_of_resolution_plans_received = models.IntegerField()
    liquidation_value = models.DecimalField(max_digits=20, decimal_places=2)
    highest_resolution_value_proposed = models.DecimalField(max_digits=20, decimal_places=2)
    realisable_amount_by_fcs = models.DecimalField(max_digits=20, decimal_places=2)
    realisable_amount_by_ocs = models.DecimalField(max_digits=20, decimal_places=2)
    summary_outcome_date = models.CharField(max_length=20)
    subject = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    excel_file_name = models.CharField(max_length=255)
    excel_file_path = models.CharField(max_length=255)
    date_scraped = models.DateTimeField(auto_now_add=True)


    class Meta:
        db_table = 'ibbi_corporate_insolvency_process'

# Model for the ibbi_voluntary_liquidation_process table
class VoluntaryLiquidation(models.Model):
    s_no = models.AutoField(primary_key=True)  
    source_name = models.CharField(max_length=100)
    name_of_corporate_person = models.CharField(max_length=255)
    date_of_commencement = models.CharField(max_length=20)
    date_of_dissolution = models.CharField(max_length=20)
    realisation_of_assets = models.DecimalField(max_digits=20, decimal_places=2)
    amount_due_to_creditors = models.DecimalField(max_digits=20, decimal_places=2)
    amount_paid_to_creditors = models.DecimalField(max_digits=20, decimal_places=2)
    liquidation_expenses = models.DecimalField(max_digits=20, decimal_places=2)
    surplus = models.DecimalField(max_digits=20, decimal_places=2)
    time_taken_days = models.IntegerField()
    summary_outcome_date = models.CharField(max_length=20)
    subject = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    excel_file_name = models.CharField(max_length=255)
    excel_file_path = models.CharField(max_length=255)
    date_scraped = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ibbi_voluntary_liquidation_process'


# Model for the ibbi_liquidation_process table
class Liquidation(models.Model):
    s_no = models.AutoField(primary_key=True)  
    source_name = models.CharField(max_length=100)
    name_of_the_corporate_person = models.CharField(max_length=255)
    cin = models.CharField(max_length=100)
    liquidation_commencement_date = models.CharField(max_length=20)
    date_of_order_of_dissolution_closure = models.CharField(max_length=20)
    realization_of_security_interest_admitted_claims = models.DecimalField(max_digits=20, decimal_places=2)
    realization_of_security_interest_amount_paid = models.DecimalField(max_digits=20, decimal_places=2)
    irpc_and_liquidation_cost = models.DecimalField(max_digits=20, decimal_places=2)
    workmens_dues_admitted_claims = models.DecimalField(max_digits=20, decimal_places=2)
    workmens_dues_amount_paid = models.DecimalField(max_digits=20, decimal_places=2)
    debts_of_secured_creditors_admitted_claims = models.DecimalField(max_digits=20, decimal_places=2)
    debts_of_secured_creditors_amount_paid = models.DecimalField(max_digits=20, decimal_places=2)
    wages_and_unpaid_dues_to_employees_admitted_claims = models.DecimalField(max_digits=20, decimal_places=2)
    wages_and_unpaid_dues_to_employees_amount_paid = models.DecimalField(max_digits=20, decimal_places=2)
    debts_of_unsecured_financial_creditors_admitted_claims = models.DecimalField(max_digits=20, decimal_places=2)
    debts_of_unsecured_financial_creditors_amount_paid = models.DecimalField(max_digits=20, decimal_places=2)
    govt_dues_admitted_claims = models.DecimalField(max_digits=20, decimal_places=2)
    govt_dues_amount_paid = models.DecimalField(max_digits=20, decimal_places=2)
    any_remaining_debts_and_dues_admitted_claims = models.DecimalField(max_digits=20, decimal_places=2)
    any_remaining_debts_and_dues_amount_paid = models.DecimalField(max_digits=20, decimal_places=2)
    preference_shareholders_admitted_claims = models.DecimalField(max_digits=20, decimal_places=2)
    preference_shareholders_amount_paid = models.DecimalField(max_digits=20, decimal_places=2)
    equity_shareholders_admitted_claims = models.DecimalField(max_digits=20, decimal_places=2)
    equity_shareholders_amount_paid = models.DecimalField(max_digits=20, decimal_places=2)
    amount_of_total_admitted_claim = models.DecimalField(max_digits=20, decimal_places=2)
    liquidation_value = models.DecimalField(max_digits=20, decimal_places=2)
    final_total_realised_value = models.DecimalField(max_digits=20, decimal_places=2)
    amount_distributed_to_stakeholders = models.DecimalField(max_digits=20, decimal_places=2)
    time_taken_days = models.IntegerField()
    summary_outcome_date = models.CharField(max_length=20)
    subject = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    excel_file_name = models.CharField(max_length=255)
    excel_file_path = models.CharField(max_length=255)
    date_scraped = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ibbi_liquidation_process'
