from rest_framework import serializers

from .models import (
    Contract,
    VariationOrder,
    ExtensionOfTime,
    IPC,
    Claim,
)


# ---------------------------------------------------------
# Variation Order Serializer
# ---------------------------------------------------------

class VariationOrderSerializer(serializers.ModelSerializer):

    class Meta:
        model = VariationOrder

        fields = [
            "vo_id",
            "contract",
            "vo_number",
            "value",
            "approved_date",
            "description",
        ]

        read_only_fields = [
            "vo_id",
        ]


# ---------------------------------------------------------
# Extension of Time Serializer
# ---------------------------------------------------------

class ExtensionOfTimeSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExtensionOfTime

        fields = [
            "eot_id",
            "contract",
            "eot_number",
            "approved_days",
            "approved_date",
            "reason",
        ]

        read_only_fields = [
            "eot_id",
        ]


# ---------------------------------------------------------
# IPC / Payment Certificate Serializer
# ---------------------------------------------------------

class IPCSerializer(serializers.ModelSerializer):

    class Meta:
        model = IPC

        fields = [
            "ipc_id",
            "contract",
            "ipc_number",
            "ipc_date",
            "certified_amount",
            "paid_amount",
            "retention_amount",
            "created_at",
        ]

        read_only_fields = [
            "ipc_id",
            "created_at",
        ]


# ---------------------------------------------------------
# Claim Serializer
# ---------------------------------------------------------

class ClaimSerializer(serializers.ModelSerializer):

    class Meta:
        model = Claim

        fields = [
            "claim_id",
            "contract",
            "claim_date",
            "claim_amount",
            "description",
            "status",
        ]

        read_only_fields = [
            "claim_id",
        ]


# ---------------------------------------------------------
# Contract Serializer
# ---------------------------------------------------------

class ContractSerializer(serializers.ModelSerializer):

    # Contract lifecycle information
    variation_orders = VariationOrderSerializer(
        many=True,
        read_only=True
    )

    extensions_of_time = ExtensionOfTimeSerializer(
        many=True,
        read_only=True
    )

    ipcs = IPCSerializer(
        many=True,
        read_only=True
    )

    claims = ClaimSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Contract

        fields = [
            # Contract identity
            "contract_id",

            # Relationships
            "project",
            "contractor_org",
            "consultant_org",

            # Contract information
            "contract_number",
            "contract_amount",
            "revised_contract_amount",

            # Dates
            "contract_signing_date",
            "commencement_date",
            "original_completion_date",
            "revised_completion_date",
            "contract_duration_months",

            # Security and payment
            "performance_security_amount",
            "performance_security_expiry",
            "advance_payment_amount",
            "advance_payment_recovered",

            # Status
            "current_status",

            # Audit fields
            "created_at",
            "updated_at",

            # Contract lifecycle
            "variation_orders",
            "extensions_of_time",
            "ipcs",
            "claims",
        ]

        read_only_fields = [
            "contract_id",
            "created_at",
            "updated_at",
        ]