const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [jobForm, setJobForm] = useState({ companyName: "", role: "", ctc: "", minCGPA: "" });

  useEffect(() => {
    axios.get('http://localhost:5000/api/admin/students').then(res => setStudents(res.data));
  }, []);

  const handlePostJob = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/api/jobs', jobForm);
    alert("Job Posted Successfully!");
  };

  return (
    <div style={{ padding: '40px' }}>
      <h1>TPO Admin Panel</h1>
      
      {/* SECTION: POST NEW JOB */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
        <h3>Post New Opportunity</h3>
        <form onSubmit={handlePostJob}>
          <input placeholder="Company Name" onChange={e => setJobForm({...jobForm, companyName: e.target.value})} style={styles.input} />
          <input placeholder="Role" onChange={e => setJobForm({...jobForm, role: e.target.value})} style={styles.input} />
          <input placeholder="CTC (e.g. 6 LPA)" onChange={e => setJobForm({...jobForm, ctc: e.target.value})} style={styles.input} />
          <button type="submit" style={styles.btn}>Post Job</button>
        </form>
      </div>

      {/* SECTION: VIEW APPLICANTS & RESUMES */}
      <h3>Student Database & Resumes</h3>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Reg No</th>
            <th>CGPA</th>
            <th>Resume</th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s._id}>
              <td>{s.name}</td>
              <td>{s.registrationNo}</td>
              <td>{s.cgpa}</td>
              <td>
                {s.resumeUrl ? (
                  <a href={`http://localhost:5000${s.resumeUrl}`} target="_blank" rel="noreferrer">
                    📄 View PDF
                  </a>
                ) : "No Resume"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};