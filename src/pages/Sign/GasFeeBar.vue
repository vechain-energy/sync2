<template>
    <q-item class="gas-fee-item">
        <q-item-section
            avatar
            class="gas-fee-label-section"
        >
            <q-item-label caption>{{$t('sign.label_estimate_fee')}}</q-item-label>
        </q-item-section>
        <q-item-section class="gas-fee-value-section">
            <div>
                <div class="gas-fee-primary">
                    <span
                        v-if="fee"
                        class="gas-fee-amount"
                    >
                        <amount-label
                            :value="fee"
                            :decimals="feeToken ? feeToken.decimals : 18"
                        />
                    </span>
                    <q-spinner-dots
                        v-else
                        color="primary"
                    />
                    <token-avatar
                        v-if="feeToken"
                        :spec="feeToken"
                        size="1.35em"
                    />
                </div>
                <q-item-label
                    v-if="maxFee"
                    caption
                    class="gas-fee-caption"
                >
                    {{$t('sign.label_max_fee')}}
                    <amount-label
                        :value="maxFee"
                        :decimals="18"
                    />
                </q-item-label>
                <q-item-label
                    v-if="isDelegation"
                    caption
                    class="gas-fee-caption"
                >{{$t('sign.msg_fee_delegation')}}</q-item-label>
                <q-item-label
                    v-if="caption"
                    caption
                    class="gas-fee-caption"
                >{{caption}}</q-item-label>
            </div>
        </q-item-section>
        <q-item-section
            side
            class="gas-fee-action-section"
        >
            <q-item-label class="gas-fee-actions">
                <slot />
            </q-item-label>
        </q-item-section>
    </q-item>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import AmountLabel from 'src/components/AmountLabel.vue'
import TokenAvatar from 'src/components/TokenAvatar.vue'

export default defineComponent({
    components: { AmountLabel, TokenAvatar },
    props: {
        fee: String,
        maxFee: String,
        isDelegation: Boolean,
        feeToken: Object as () => M.TokenSpec,
        caption: String
    }
})
</script>
<style scoped>
.gas-fee-item {
    align-items: center;
}

.gas-fee-label-section {
    min-width: 82px;
    padding-right: 10px;
}

.gas-fee-value-section {
    min-width: 0;
}

.gas-fee-primary {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 24px;
    white-space: nowrap;
}

.gas-fee-amount {
    font-size: 1rem;
    line-height: 1.2;
}

.gas-fee-caption {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    line-height: 1.25;
}

.gas-fee-action-section {
    flex: 0 0 auto;
    padding-left: 8px;
}

.gas-fee-actions {
    display: block;
}

.gas-fee-actions :deep(.row) {
    flex-wrap: wrap;
    justify-content: flex-end;
    row-gap: 6px;
}

@media (max-width: 420px) {
    .gas-fee-item {
        align-items: flex-start;
        flex-wrap: wrap;
    }

    .gas-fee-label-section {
        flex: 0 0 82px;
    }

    .gas-fee-value-section {
        flex: 1 1 calc(100% - 92px);
    }

    .gas-fee-action-section {
        flex: 0 0 100%;
        padding-left: 92px;
        padding-top: 8px;
    }

    .gas-fee-actions :deep(.row) {
        justify-content: flex-start;
    }
}
</style>
