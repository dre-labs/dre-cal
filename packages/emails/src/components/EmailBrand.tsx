import { WEBAPP_URL } from "@calcom/lib/constants";
import Row from "./Row";

const EmailBrand = () => {
  const logoImage = `${WEBAPP_URL}/emails/dre-icon-color.png`;
  const brandName = "DRE_cal";

  return (
    <Row border="0" style={{ borderCollapse: "collapse", borderSpacing: "0px" }}>
      <td style={{ verticalAlign: "middle", width: "20px" }}>
        <a href={WEBAPP_URL} target="_blank" rel="noreferrer">
          <img
            height="20"
            src={logoImage}
            style={{
              border: "0",
              display: "block",
              outline: "none",
              textDecoration: "none",
              height: "20px",
              width: "20px",
              fontSize: "13px",
            }}
            width="20"
            alt={brandName}
          />
        </a>
      </td>
      <td
        style={{
          color: "#101010",
          fontFamily: "Roboto, Helvetica, sans-serif",
          fontSize: "16px",
          fontWeight: 600,
          lineHeight: "20px",
          paddingLeft: "8px",
          verticalAlign: "middle",
        }}>
        <a
          href={WEBAPP_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "#101010",
            textDecoration: "none",
          }}>
          {brandName}
        </a>
      </td>
    </Row>
  );
};

export default EmailBrand;
