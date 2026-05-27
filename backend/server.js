import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- [ 설정 ] ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// --- [ AI 설정 (Render 환경변수 사용) ] ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- [ 1. MongoDB 연결 ] ---
const MONGO_URI = "mongodb+srv://admin:1234@cluster0.ursxinm.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ DB 연결 성공! 진짜 DB 사용 중"))
    .catch(err => console.error("❌ DB 연결 실패:", err));

// --- [ 2. 유저 데이터 모델 정의 ] ---
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resumeScore: {
        edu: { type: Number, default: 0 },
        exp: { type: Number, default: 0 },
        skill: { type: Number, default: 0 },
        reason: { type: String, default: "" }
    }
});
const User = mongoose.model("User", userSchema);

// --- [ 2-1. 게시글 데이터 모델 정의 ] ---
const postSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model("Post", postSchema);

// --- [ 3. 채용 공고 데이터 (40개) ] ---
const myJobData = [
    { idx: "1", title: "2026 상반기 사무행정 신입 사원 공채", company: "한국전력공사", location: "나주", type: "신입", jobType: "정규직", salary: "4,000만원", deadline: "2026-05-30" },
    { idx: "2", title: "IT 보안 및 인프라 운영 전문가", company: "한국인터넷진흥원", location: "나주", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-04-15" },
    { idx: "3", title: "프론트엔드 개발자 인턴십", company: "카카오", location: "성남", type: "인턴", jobType: "체험형", salary: "250만원", deadline: "2026-06-01" },
    { idx: "4", title: "데이터 분석가 (Data Scientist)", company: "토스", location: "서울", type: "무관", jobType: "정규직", salary: "업계최고", deadline: "2026-05-20" },
    { idx: "5", title: "행정직(6급) 신입 사원 모집", company: "건보공단", location: "원주", type: "신입", jobType: "정규직", salary: "3,800만원", deadline: "2026-04-28" },
    { idx: "6", title: "Service 백엔드 엔지니어", company: "네이버", location: "성남", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-12-31" },
    { idx: "7", title: "원자력 발전 설비 운영", company: "한수원", location: "경주", type: "신입", jobType: "정규직", salary: "4,200만원", deadline: "2026-05-12" },
    { idx: "8", title: "모바일 앱 개발(iOS)", company: "라인", location: "성남", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-04-30" },
    { idx: "9", title: "일반직 및 상담직 신입", company: "근로복지공단", location: "울산", type: "신입", jobType: "정규직", salary: "3,600만원", deadline: "2026-05-05" },
    { idx: "10", title: "서비스 플랫폼 개발", company: "당근", location: "서울", type: "경력", jobType: "정규직", salary: "업계상위", deadline: "2026-05-15" },
    { idx: "11", title: "환경 시설 점검 및 관리", company: "환경공단", location: "인천", type: "신입", jobType: "정규직", salary: "3,700만원", deadline: "2026-04-22" },
    { idx: "12", title: "서비스 기획자", company: "배민", location: "서울", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-05-10" },
    { idx: "13", title: "기술직(토목) 신입", company: "도로공사", location: "김천", type: "신입", jobType: "정규직", salary: "3,900만원", deadline: "2026-06-12" },
    { idx: "14", title: "패션 MD 운영자", company: "무신사", location: "서울", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-04-25" },
    { idx: "15", title: "에너지 생산 관리", company: "가스공사", location: "대구", type: "신입", jobType: "정규직", salary: "4,100만원", deadline: "2026-05-08" },
    { idx: "16", title: "자율주행 시스템 개발", company: "현대차", location: "화성", type: "경력", jobType: "정규직", salary: "6,000+", deadline: "2026-05-25" },
    { idx: "17", title: "체험형 청년 인턴", company: "코레일", location: "대전", type: "인턴", jobType: "체험형", salary: "220만원", deadline: "2026-06-30" },
    { idx: "18", title: "클라우드 보안 컨설턴트", company: "삼성SDS", location: "서울", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-04-20" },
    { idx: "19", title: "관광 콘텐츠 기획", company: "관광공사", location: "원주", type: "신입", jobType: "정규직", salary: "3,800만원", deadline: "2026-05-18" },
    { idx: "20", title: "게임 서버 개발", company: "넥슨", location: "성남", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-05-05" },
    { idx: "21", title: "문화예술 전시 기획", company: "예술의전당", location: "서울", type: "신입", jobType: "정규직", salary: "3,500만원", deadline: "2026-04-29" },
    { idx: "22", title: "UX 디자이너", company: "야놀자", location: "서울", type: "경력", jobType: "정규직", salary: "상위", deadline: "2026-05-11" },
    { idx: "23", title: "산업 안전 기술직", company: "안전보건공단", location: "울산", type: "신입", jobType: "정규직", salary: "3,750만원", deadline: "2026-05-02" },
    { idx: "24", title: "해외 가전 영업", company: "LG전자", location: "서울", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-04-18" },
    { idx: "25", title: "인천공항 보안 관리 인턴", company: "인천공항공사", location: "인천", type: "인턴", jobType: "체험형", salary: "230만원", deadline: "2026-06-20" },
    { idx: "26", title: "전동화 시스템 연구원", company: "모비스", location: "용인", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-05-07" },
    { idx: "27", title: "물류 최적화 매니저", company: "쿠팡", location: "서울", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-04-27" },
    { idx: "28", title: "대학 행정직", company: "서울대학교", location: "서울", type: "신입", jobType: "정규직", salary: "3,600만원", deadline: "2026-05-14" },
    { idx: "29", title: "글로벌 마케팅 인턴", company: "CJ제일제당", location: "서울", type: "인턴", jobType: "채용전제", salary: "240만원", deadline: "2026-06-05" },
    { idx: "30", title: "도시 재생 토목 설계", company: "LH공사", location: "진주", type: "신입", jobType: "정규직", salary: "3,950만원", deadline: "2026-05-22" },
    { idx: "31", title: "핀테크 보안 엔지니어", company: "뱅크샐러드", location: "서울", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-04-12" },
    { idx: "32", title: "방송 콘텐츠 PD 신입", company: "KBS", location: "서울", type: "신입", jobType: "정규직", salary: "4,200만원", deadline: "2026-05-09" },
    { idx: "33", title: "통신망 데이터 분석", company: "SKT", location: "서울", type: "경력", jobType: "정규직", salary: "최고", deadline: "2026-05-03" },
    { idx: "34", title: "항만 물류 관리 신입", company: "부산항만공사", location: "부산", type: "신입", jobType: "정규직", salary: "3,850만원", deadline: "2026-05-28" },
    { idx: "35", title: "커머스 플랫폼 기획", company: "브랜디", location: "서울", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-04-16" },
    { idx: "36", title: "식품 안전 품질 관리", company: "오뚜기", location: "안양", type: "신입", jobType: "정규직", salary: "3,700만원", deadline: "2026-05-19" },
    { idx: "37", title: "IT 기술 관리", company: "전파진흥원", location: "나주", type: "신입", jobType: "정규직", salary: "3,800만원", deadline: "2026-05-01" },
    { idx: "38", title: "HRBP 인사 기획", company: "우아한형제들", location: "서울", type: "경력", jobType: "정규직", salary: "협의", deadline: "2026-04-24" },
    { idx: "39", title: "산림 서비스 기획", company: "산림복지진흥원", location: "대전", type: "신입", jobType: "정규직", salary: "3,600만원", deadline: "2026-05-13" },
    { idx: "40", title: "가상자산 백엔드 개발", company: "두나무", location: "서울", type: "경력", jobType: "정규직", salary: "최고", deadline: "2026-05-27" }
];

// --- [ 4. API 경로 설정 ] ---

// AI 분석 API (가장 안전한 최신 모델 식별자 지정)
app.post('/api/analyze', async (req, res) => {
    try {
        const { resumeData } = req.body;
        
        // 모델명을 gemini-1.5-flash-latest 로 교체하여 404 해결 시도
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = `이력서를 1~10점으로 분석해. 아래 JSON 형식으로만 답해. 부연 설명 금지. {"edu": 점수, "exp": 점수, "skill": 점수, "reason": "장단점 요약"}. 내용: ${resumeData}`;
        
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        res.json(JSON.parse(cleanText));
    } catch (err) {
        console.error("AI 에러 상세:", err);
        res.status(500).json({ error: "AI 분석 실패", details: err.message });
    }
});

// 공고 리스트 조회
app.get("/api/jobs", (req, res) => {
    res.json({ data: myJobData });
});

// 회원가입
app.post("/api/register", async (req, res) => {
    try {
        const { userId, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ userId, password: hashedPassword });
        await newUser.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: "아이디 중복" });
    }
});

// 로그인
app.post("/api/login", async (req, res) => {
    const { userId, password } = req.body;
    const user = await User.findOne({ userId });
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ success: true, userId: user.userId, score: user.resumeScore });
    } else {
        res.status(401).json({ success: false, message: "틀림" });
    }
});

// 분석 결과 저장
app.post('/api/save-analysis', async (req, res) => {
    try {
        const { userId, result } = req.body;
        const updatedUser = await User.findOneAndUpdate(
            { userId: userId },
            {
                $set: {
                    resumeScore: {
                        edu: result.edu,
                        exp: result.exp,
                        skill: result.skill,
                        reason: result.reason
                    }
                }
            },
            { new: true }
        );
        
        if (updatedUser) {
            console.log(`[저장완료] ${userId} 님의 분석 결과 업데이트`);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: "유저를 찾을 수 없음" });
        }
    } catch (err) {
        console.error("DB 저장 에러:", err);
        res.status(500).json({ success: false });
    }
});

// 내 정보(저장된 점수) 불러오기
app.get('/api/my-profile/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) return res.status(404).json({ message: "유저 없음" });
        res.json({
            userId: user.userId,
            score: user.resumeScore
        });
    } catch (err) {
        res.status(500).json({ message: "서버 오류" });
    }
});

// --- [ 5. 커뮤니티 게시판 API ] ---

// 게시글 등록
app.post('/api/posts', async (req, res) => {
    try {
        const { userId, title, content } = req.body;
        const newPost = new Post({ userId, title, content });
        await newPost.save();
        res.json({ success: true });
    } catch (err) {
        console.error("게시글 저장 에러:", err);
        res.status(500).json({ success: false });
    }
});

// 게시글 목록 불러오기
app.get('/api/posts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;

        const totalPosts = await Post.countDocuments();
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            posts,
            totalPages: Math.ceil(totalPosts / limit),
            currentPage: page
        });
    } catch (err) {
        console.error("게시글 로드 에러:", err);
        res.status(500).json({ message: "서버 오류" });
    }
});

// 게시글 삭제
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const post = await Post.findById(id);
        
        if (!post) return res.status(404).json({ message: "게시글 없음" });
        if (post.userId !== userId) return res.status(403).json({ message: "권한 없음" });

        await Post.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 게시글 수정
app.put('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, content } = req.body;
        const post = await Post.findById(id);

        if (!post) return res.status(404).json({ message: "게시글 없음" });
        if (post.userId !== userId) return res.status(403).json({ message: "권한 없음" });

        await Post.findByIdAndUpdate(id, { content });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// --- [ 서버 시작 ] ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 성공적으로 작동 중입니다!`);
});