<template>
  <div class="detail-page">
    <!-- 面包屑 -->
    <div class="breadcrumb-bar">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/bureau/custody/org/review' }"
          >审核列表</el-breadcrumb-item
        >
        <el-breadcrumb-item>审核详情</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 详情内容 -->
    <div class="detail-card">
      <div class="detail-grid">
        <!-- 姓名/头像 -->
        <div class="field-item field-full">
          <span class="field-label">
            姓名：
            <el-icon v-if="detail.hasChange" class="field-warn"><WarningFilled /></el-icon>
          </span>
          <div class="avatar-box">
            <el-image :src="detail.avatar" fit="cover" class="avatar-img" />
          </div>
        </div>

        <!-- 第一行：三列 -->
        <div class="field-item">
          <span class="field-label">机构/企业全称：</span>
          <span class="field-value">{{ detail.orgFullName }}</span>
        </div>
        <div class="field-item">
          <span class="field-label">所属地区：</span>
          <span class="field-value">{{ detail.region }}</span>
        </div>
        <div class="field-item">
          <span class="field-label">法定代表人：</span>
          <span class="field-value">{{ detail.legalPerson }}</span>
        </div>

        <!-- 第二行 -->
        <div class="field-item">
          <span class="field-label">社会信用代码：</span>
          <span class="field-value">{{ detail.creditCode }}</span>
        </div>
        <div class="field-item">
          <span class="field-label">办学许可证：</span>
          <span class="field-value">{{ detail.licenseNo }}</span>
        </div>
        <div class="field-item">
          <span class="field-label">详细地址：</span>
          <span class="field-value">{{ detail.address }}</span>
        </div>

        <!-- 第三行 -->
        <div class="field-item">
          <span class="field-label">联系人：</span>
          <span class="field-value">{{ detail.contact }}</span>
        </div>
        <div class="field-item">
          <span class="field-label">联系电话：</span>
          <span class="field-value">{{ detail.phone }}</span>
        </div>
        <div class="field-item">
          <span class="field-label">机构官网：</span>
          <span class="field-value">{{ detail.website }}</span>
        </div>

        <!-- 经营范围 -->
        <div class="field-item field-full">
          <span class="field-label">经营范围：</span>
          <span class="field-value">{{ detail.businessScope }}</span>
        </div>

        <!-- 办学许可证有效期 -->
        <div class="field-item field-full">
          <span class="field-label">办学许可证有效期范围：</span>
          <span class="field-value">{{ detail.licenseValidRange }}</span>
        </div>

        <!-- 办学许可证图片 -->
        <div class="field-item field-full">
          <span class="field-label">办学许可证：</span>
          <div class="image-list">
            <el-image
              v-for="(img, i) in detail.licenseImages"
              :key="i"
              :src="img"
              :preview-src-list="detail.licenseImages"
              :initial-index="i"
              fit="cover"
              class="thumb-img"
            />
          </div>
        </div>

        <!-- 营业执照有效期 -->
        <div class="field-item field-full">
          <span class="field-label">营业执照有效期范围：</span>
          <span class="field-value">{{ detail.businessValidRange }}</span>
        </div>

        <!-- 营业执照图片 -->
        <div class="field-item field-full">
          <span class="field-label">营业执照：</span>
          <div class="image-list">
            <el-image
              v-for="(img, i) in detail.businessImages"
              :key="i"
              :src="img"
              :preview-src-list="detail.businessImages"
              :initial-index="i"
              fit="cover"
              class="thumb-img"
            />
          </div>
        </div>

        <!-- 法人身份证 -->
        <div class="field-item">
          <span class="field-label">法人身份证国徽面：</span>
          <div class="image-list">
            <el-image
              :src="detail.idCardFront"
              :preview-src-list="[detail.idCardFront]"
              fit="cover"
              class="id-card-img"
            />
          </div>
        </div>
        <div class="field-item">
          <span class="field-label">法人身份证人像面：</span>
          <div class="image-list">
            <el-image
              :src="detail.idCardBack"
              :preview-src-list="[detail.idCardBack]"
              fit="cover"
              class="id-card-img"
            />
          </div>
        </div>

        <!-- 承诺书 -->
        <div class="field-item field-full">
          <span class="field-label">承诺书：</span>
          <div class="image-list">
            <el-image
              v-for="(img, i) in detail.commitmentImages"
              :key="i"
              :src="img"
              :preview-src-list="detail.commitmentImages"
              :initial-index="i"
              fit="cover"
              class="thumb-img"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="footer-bar">
      <el-button @click="handleBack">返回</el-button>
      <el-button type="danger" plain :icon="Close" @click="handleReject">拒绝</el-button>
      <el-button type="primary" :icon="Check" @click="handleApprove">同意</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { WarningFilled, Close, Check } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { fetchOrgDetail, updateOrgReviewStatus } from "@/mock/bureau/custody/orgReview";

const router = useRouter();
const route = useRoute();

const orgId = Number(route.params.id);

// 详情数据（从 mock 获取基础信息，图片等扩展字段仍用虚拟数据）
const detail = ref({
  id: 0,
  hasChange: true,
  avatar: "https://via.placeholder.com/130/1a1a1a/ff6600?text=🔥",
  orgFullName: "",
  region: "广东省 广州市 花都区",
  legalPerson: "李国平",
  creditCode: "91440101MMAMA9Y82773",
  licenseNo: "14408493929249",
  address: "",
  contact: "",
  phone: "",
  website: "https://www.wasag.com",
  businessScope: "K-12课外辅导，素质教育",
  licenseValidRange: "2025-05-20 至 2028-12-12",
  licenseImages: [
    "https://via.placeholder.com/100/fafafa/999?text=许可证1",
    "https://via.placeholder.com/100/fafafa/999?text=许可证2",
    "https://via.placeholder.com/100/fafafa/999?text=许可证3",
  ],
  businessValidRange: "2025-05-20 至 2028-12-12",
  businessImages: [
    "https://via.placeholder.com/100/fafafa/999?text=执照1",
    "https://via.placeholder.com/100/fafafa/999?text=执照2",
    "https://via.placeholder.com/100/fafafa/999?text=执照3",
  ],
  idCardFront: "https://via.placeholder.com/285x176/fafafa/999?text=国徽面",
  idCardBack: "https://via.placeholder.com/285x176/fafafa/999?text=人像面",
  commitmentImages: [
    "https://via.placeholder.com/100/fafafa/999?text=承诺书1",
    "https://via.placeholder.com/100/fafafa/999?text=承诺书2",
    "https://via.placeholder.com/100/fafafa/999?text=承诺书3",
  ],
});

onMounted(async () => {
  const row = await fetchOrgDetail(orgId);
  if (row) {
    detail.value.id = row.id;
    detail.value.orgFullName = row.orgName;
    detail.value.address = row.address;
    detail.value.contact = row.contact;
    detail.value.phone = row.phone;
  }
});

function handleBack() {
  router.push("/bureau/custody/org/review");
}

function handleReject() {
  ElMessageBox.prompt("请输入拒绝原因", "拒绝审核", {
    confirmButtonText: "确认拒绝",
    cancelButtonText: "取消",
    type: "warning",
    inputType: "textarea",
  })
    .then(async ({ value }) => {
      await updateOrgReviewStatus(orgId, "rejected", value);
      ElMessage.info("已拒绝");
      router.push("/bureau/custody/org/review");
    })
    .catch(() => {});
}

function handleApprove() {
  ElMessageBox.confirm("确认同意该机构的审核申请？", "审核通过", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "success",
  })
    .then(async () => {
      await updateOrgReviewStatus(orgId, "approved");
      ElMessage.success("审核通过");
      router.push("/bureau/custody/org/review");
    })
    .catch(() => {});
}
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
  /* 突破父级 app-content-inner 的 padding */
  margin: calc(-1 * var(--content-padding));
}

/* 面包屑 */
.breadcrumb-bar {
  padding: 16px 24px;
  flex-shrink: 0;
}

/* 详情卡片 - 可滚动区域 */
.detail-card {
  flex: 1;
  overflow-y: auto;
  margin: 0 24px;
  padding: 24px;
  background: var(--color-white);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.field-full {
  grid-column: 1 / -1;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  color: var(--color-secondary);
  line-height: 24px;
}

.field-warn {
  color: var(--color-warning);
  font-size: 16px;
}

.field-value {
  font-size: 16px;
  color: var(--color-title);
  line-height: 24px;
  word-break: break-all;
}

/* 头像 */
.avatar-box {
  width: 130px;
  height: 130px;
  border-radius: 8px;
  overflow: hidden;
}

.avatar-img {
  width: 130px;
  height: 130px;
}

/* 图片列表 */
.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.thumb-img {
  width: 100px;
  height: 100px;
  border-radius: 4px;
  border: 1px solid var(--color-border-strong);
  cursor: pointer;
}

.id-card-img {
  width: 285px;
  height: 176px;
  border-radius: 4px;
  cursor: pointer;
}

/* 底部操作栏 - 固定底部，宽度100% */
.footer-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  background: var(--color-white);
  border-top: 1px solid var(--color-bg-soft);
  flex-shrink: 0;
  width: 100%;
  position: sticky;
  bottom: 0;
}
</style>
