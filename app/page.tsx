import fs from "node:fs";
import path from "node:path";

type SchoolMasterRow = {
  schoolName: string;
  neisSchoolCode: string;
  schoolInfoCode: string;
  level: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  foundationType: string;
  coedType: string;
};

function readSchoolMaster(): SchoolMasterRow[] {
  const filePath = path.join(process.cwd(), "data", "processed", "school_master.json");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[page] failed to read school_master.json", error);
    return [];
  }
}

export default function Home() {
  const schools = readSchoolMaster();
  const samples = schools.slice(0, 5);

  return (
    <main className="page">
      <section className="summary">
        <p className="eyebrow">대전 지역 중학교</p>
        <h1>교육 공공데이터 수집 현황</h1>
        {schools.length > 0 ? (
          <p className="lead">
            현재 정규화된 학교 기본정보 <strong>{schools.length.toLocaleString("ko-KR")}</strong>건을
            확인했습니다.
          </p>
        ) : (
          <p className="lead">아직 수집된 데이터가 없습니다. npm run fetch:schools를 먼저 실행하세요.</p>
        )}
      </section>

      {samples.length > 0 ? (
        <section className="tableSection" aria-label="학교 기본정보 샘플">
          <table>
            <thead>
              <tr>
                <th>학교명</th>
                <th>NEIS 코드</th>
                <th>학교알리미 코드</th>
                <th>구분</th>
                <th>설립</th>
                <th>남녀공학</th>
                <th>주소</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((school) => (
                <tr key={school.neisSchoolCode}>
                  <td>{school.schoolName}</td>
                  <td>{school.neisSchoolCode}</td>
                  <td>{school.schoolInfoCode || "-"}</td>
                  <td>{school.level}</td>
                  <td>{school.foundationType || "-"}</td>
                  <td>{school.coedType || "-"}</td>
                  <td>{school.address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}

