import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"
import Button from "../components/button"

class IndexPage extends React.Component {
  render() {
    const siteTitle = "Practical JavaScript"

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO title="Home" keywords={[`blog`, `nodejs`, `javascript`]} />
        <img
          style={{ margin: 0 }}
          src="./developer-activity.svg"
          alt="Developer Activity"
        />
        <h1>
          Hey people{" "}
          <span role="img" aria-label="wave emoji">
            👋
          </span>
        </h1>
        <p>
          Welcome to Practical Javascript! A blog on the APPLICATION of
          JavaScript in the real world. Now let's go build something great!
        </p>
        <Link to="/blog/">
          <Button marginTop="35px">Go to Blog</Button>
        </Link>
      </Layout>
    )
  }
}

export default IndexPage
